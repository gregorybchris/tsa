#!/usr/bin/env python

from collections import defaultdict
from datetime import datetime
from enum import Enum
from fuzzywuzzy import fuzz
import sqlite3
import csv
import re

DATASETS_DIRECTORY = 'datasets'
DATABASE = 'tsa.db'
AIRPORT_CODES = 'airport-codes.csv'
AIRPORT_CAPACITIES = 'airport_capacities.csv'

DATASET_HEADERS = [
    'Claim Number',
    'Date Received',
    'Incident Date',
    'Airport Code',
    'Airport Name',
    'Airline Name',
    'Claim Type',
    'Claim Site',
    'Claim Amount',
    'Status',
    'Close Amount',
    'Disposition',
]

AIRPORT_CODE_HEADERS = [
    'ident',
    'type',
    'name',
    'coordinates',
    'elevation_ft',
    'continent',
    'iso_country',
    'iso_region',
    'municipality',
    'gps_code',
    'iata_code',
    'local_code',
]

AIRPORT_CAPACTIY_HEADERS = [
    'Airport Code',
    'International Passengers',
    'Domestic Passengers',
]

GARBAGE_ITEMS = [
    'B',
    'Ba',
    'C',
    'H',
    'O',
    'P',
    'Pe',
    'Per',
    'Pers',
    'Perso',
    'Persona',
    'Personal',
    'Items',
]

class FutureDateException(Exception):
    pass

class ImportVersion(Enum):
    V1 = 1
    V2 = 2
    V3 = 3
    V4 = 4
    V5 = 5

    def __lt__(self, other):
        if self.__class__ is other.__class__:
            return self.value < other.value
        raise TypeError

    def __gt__(self, other):
        if self.__class__ is other.__class__:
            return self.value > other.value
        raise TypeError

    def __eq__(self, other):
        if self.__class__ is other.__class__:
            return self.value == other.value
        raise TypeError

    def __neq__(self, other):
        if self.__class__ is other.__class__:
            return self.value != other.value
        raise TypeError

class Dataset(object):

    def __init__(self, name, version):
        self.__name = name
        self.__version = version

    def get_name(self):
        return self.__name

    def insert_into_database(self, cursor):
        filename = "{}/{}.csv".format(DATASETS_DIRECTORY, self.__name)
        with open(filename) as f:
            reader = csv.DictReader(f, quotechar='"', delimiter=',',
                                    quoting=csv.QUOTE_ALL, skipinitialspace=True)

            while True:
                try:
                    self.__claim = self.__get_next_claim(reader)
                except StopIteration:
                    break

                if self.__should_skip_row():
                    continue

                try:
                    self.__claim['Date Received'] = self.__get_date_received()
                    self.__claim['Incident Date'] = self.__get_incident_date()
                except FutureDateException:
                    continue

                self.__claim['Claim Amount'] = self.__convert_dollars_to_float(self.__get_value('Claim Amount'))
                self.__claim['Close Amount'] = self.__convert_dollars_to_float(self.__get_value('Close Amount'))
                self.__claim['Disposition'] = self.__claim['Disposition'].replace('*', '')

                self.__claim = {k: self.__clean(v) for k, v in self.__claim.iteritems()}

                cursor.execute(
                    """
                        INSERT INTO claim
                        (claim_number, date_received, incident_date, airport_code,
                         airport_name, airline, claim_type, claim_site,
                         claim_amount, status, close_amount, disposition)
                        VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (tuple(map(lambda header: self.__get_value(header), DATASET_HEADERS))))

                claim_id = cursor.lastrowid


                cursor.execute("SELECT DISTINCT name from item")
                all_items = map(lambda result: result['name'], cursor.fetchall())

                for item in self.__get_items(all_items):
                    cursor.execute(
                    """
                        SELECT id
                        FROM item
                        WHERE name = ?
                        LIMIT 1
                    """, (item,))
                    row = cursor.fetchone()
                    if row is not None:
                        item_id = row['id']
                    else:
                        cursor.execute(
                            "INSERT INTO item (name) VALUES (?)",
                            (item,)
                        )
                        item_id = cursor.lastrowid
                    cursor.execute(
                        "INSERT INTO item_claim (item, claim) VALUES (?, ?)",
                        (item_id, claim_id,)
                    )

    def __get_next_claim(self, csv_reader):
        if self.__version < ImportVersion.V4:
            return next(csv_reader)

        line1 = next(csv_reader)
        claim = line1

        if line1['Claim Number'] == 'Claim Number':
            return None
        if not any(line1.values()):
            return None

        if self.__version == ImportVersion.V4:
            if line1['Claim Number'] == '':
                claim = next(csv_reader)
        elif self.__version == ImportVersion.V5:
            num_not_empty = len(filter(lambda x: x != '', line1.values()))

            claim_number = line1['Claim Number']

            if line1['Claim Number'] == '':
                line2 = next(csv_reader)
                claim_number = line2['Claim Number']
                claim = next(csv_reader)
            elif num_not_empty == 1:
                try:
                    int(line1['Claim Number'])
                    claim_number = line1['Claim Number']
                    claim = next(csv_reader)
                except ValueError:
                    line2 = next(csv_reader)
                    claim_number = line2['Claim Number']
                    claim = next(csv_reader)
            elif num_not_empty == 2:
                claim = next(csv_reader)

            claim['Claim Number'] = claim_number

        first_half_of_airport_name = self.__clean(line1['Airport Name'])
        second_half_of_airport_name = self.__clean(claim['Airport Name'])
        airport_name = " ".join([first_half_of_airport_name, second_half_of_airport_name])
        claim['Airport Name'] = airport_name

        return claim

    def __should_skip_row(self):
        if self.__claim is None:
            return True

        if self.__get_value('Claim Number').replace('<BR>', '').strip() == '':
            return True
        return False

    def __format_date(self, date_string, format_strings):
        if self.__clean(date_string) == '':
            return ''
        for format_string in format_strings:
            try:
                if datetime.strptime(date_string, format_string) > datetime.now():
                    raise FutureDateException
                return datetime.strptime(date_string, format_string).isoformat().replace('T', ' ')
            except ValueError:
                pass
        raise ValueError

    def __get_date_received(self):
        format_strings = ['%d-%b-%y']
        if self.__version == ImportVersion.V4:
            format_strings.append('%d/%b/%y')
        return self.__format_date(self.__claim['Date Received'], format_strings)

    def __get_incident_date(self):
        format_strings = []
        if self.__version == ImportVersion.V1:
            format_strings = [
                '%m/%d/%y %H:%M',
                '%d-%b-%y00 %H:%M',
                '%d-%b-02%y %H:%M',
                '%d-%b-00%y %H:%M',
                '%d-%b-10%y %H:%M',
            ]
        elif self.__version == ImportVersion.V2:
            format_strings = [
                '%m/%d/%y %H:%M',
                '%m/%d/%y',
            ]
        elif self.__version == ImportVersion.V3:
            format_strings = [
                '%d-%b-%y',
            ]
        elif self.__version == ImportVersion.V4:
            format_strings = [
                '%d/%b/%y',
                '%d-%b-%y',
                '%m/%d/%Y %H:%M',
            ]
        elif self.__version == ImportVersion.V5:
            format_strings = [
                '%m/%d/%Y',
                '%m/%d/%Y %H:%M',
            ]
        return self.__format_date(self.__claim['Incident Date'], format_strings)

    def __convert_dollars_to_float(self, amount):
        if self.__clean(amount) == '':
            return ''
        return float(amount.replace('$', '').replace(',', ''))

    def __clean(self, value):
        if type(value) != str:
            return value
        value = value.strip()
        if value == '-':
            value = ''
        return value.decode('utf-8')

    def __get_value(self, key):
        if self.__version != ImportVersion.V1:
            if key == 'Claim Amount' or key == 'Status':
                return ''
        return self.__claim[key]

    def __get_items(self, all_items):
        def clean_item(item):
            item = item.strip()
            if item == '':
                return None
            elif item in GARBAGE_ITEMS:
                return None
            elif item == "& Accessories":
                item = None
            elif item == 'Com':
                item = None
            elif item.startswith('Baggage/Cas') or '/Purses' in item or item == 'urses':
                item = 'Baggage/Cases/Purses'
            elif item == 'meras':
                item = 'Cameras'
            elif item == 'Cloth' or item == 'Clothi' or item.endswith('hing'):
                item = 'Clothing'
            elif item.startswith('Computer &'):
                item = 'Computer & Accessories'
            elif item.startswith('Cosme') and len(item) <= 19 or item.endswith('& Grooming'):
                item = 'Cosmetics & Grooming'
            elif item in ['Fo', 'Foo', 'rink'] or item.startswith('Food &'):
                item = 'Food & Drink'
            elif item == 'oming':
                item = 'Grooming'
            elif item == 'Hom' or item == 'ecor' or item.startswith('Home D'):
                item = 'Home Decor'
            elif item.startswith('Hou') and len(item) <= 14:
                item = 'Household Items'
            elif item.startswith('Hunting'):
                item = 'Hunting & Fishing Items'
            elif item.startswith('Inciden'):
                item = 'Incidentals'
            elif (item == 'J' or item.startswith('Jew')) and item not in ['Jewelry - Costume', 'Jewelry - Fine']:
                item = 'Jewelry & Watches'
            elif item == 'Watches & Jewelry':
                item = 'Jewelry & Watches'
            elif item == 'tches' or item == 'Watches':
                item = 'Jewelry & Watches'
            elif item == 'Lock':
                item = 'Locks'
            elif item.startswith('Medical/') or  item in ['Me', 'Med', 'Medic', 'Medica']:
                item = 'Medical/Science'
            elif item == 'Musical Instruments & Accesso':
                item = 'Musical Instruments & Accessories'
            elif item.startswith('Office Equipment'):
                item = 'Office Equipment & Supplies'
            elif item in ['Ot', 'Othe']:
                item = 'Other'
            elif item == 'Outdoor Ite':
                item = 'Outdoor Items'
            elif item.startswith('Personal Ac'):
                item = 'Personal Accessories'
            elif item.startswith('Personal Documen'):
                item = 'Personal Documents'
            elif item.startswith('Personal E') or item.endswith('onics'):
                item = 'Personal Electronics'
            elif item == 'rses':
                item = 'Purses'
            elif item.startswith('Sporting'):
                item = 'Sporting Equipment & Supplies (footballs, parachutes, etc.)'
            elif item.startswith('Tools &'):
                item = 'Tools & Home Improvement Supplies'
            elif item.startswith('Toys &'):
                item = 'Toys & Games'
            elif item.startswith('Travel A'):
                item = 'Travel Accessories'
            elif item == '& Grooming':
                item = 'Cosmetics & Grooming'
            elif "zines & Other" in item:
                item = "Books, Magazines & Other"
            elif item[0] == item[0].lower(): # chopped off suffix
                if len(item) > 5:
                    def ratio(candidate):
                        if item not in candidate:
                            return 0
                        return fuzz.ratio(candidate, item)
                    best_guess = reduce(lambda x, y: x if ratio(x) > ratio(y) else y, all_items)
                    if ratio(best_guess) >= 50:
                        item = best_guess
                    else:
                        item = None
                else:
                    item = None
            return item

        try:
            item_str = self.__get_value('Item')
        except KeyError:
            item_str = self.__get_value('Item Category')
        return filter(lambda x: x is not None,
                      map(clean_item, re.split(';|\t', item_str)))

def import_airport_codes(connection):
    cursor = connection.cursor()

    cursor.execute("DROP TABLE IF EXISTS airport_codes")
    cursor.execute("""
        CREATE TABLE `airport_codes` (
        	`id`            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
            `ident`         TEXT UNIQUE,
            `type`          TEXT,
            `name`          TEXT,
            `coordinates`   TEXT,
            `elevation_ft`  INTEGER,
            `continent`     TEXT,
            `iso_country`   TEXT,
            `iso_region`    TEXT,
            `municipality`  TEXT,
            `gps_code`      TEXT,
            `iata_code`     TEXT,
            `local_code`    TEXT
        );
    """)

    with open(AIRPORT_CODES) as f:
        reader = csv.DictReader(f, quotechar='"', delimiter=',',
                                quoting=csv.QUOTE_ALL, skipinitialspace=True)
        for line in reader:
            cursor.execute(
                """
                    INSERT INTO airport_codes
                    (ident, type, name, coordinates, elevation_ft, continent,
                     iso_country, iso_region, municipality, gps_code, iata_code,
                     local_code)
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (tuple(map(lambda field: line[field].decode('utf-8'), AIRPORT_CODE_HEADERS))))
    connection.commit()

def import_airport_capacities(connection):
    cursor = connection.cursor()

    cursor.execute("DROP TABLE IF EXISTS airport_capacities")
    cursor.execute("""
        CREATE TABLE `airport_capacities` (
        	`id`                        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
            `airport_code`              TEXT UNIQUE,
            `international_passengers`  INTEGER,
            `domestic_passengers`       INTEGER
        );
    """)

    with open(AIRPORT_CAPACITIES) as f:
        reader = csv.DictReader(f, quotechar='"', delimiter=',',
                                quoting=csv.QUOTE_ALL, skipinitialspace=True)
        for line in reader:
            cursor.execute(
                """
                    INSERT INTO airport_capacities
                    (airport_code, international_passengers, domestic_passengers)
                    VALUES
                    (?, ?, ?)
                """, (tuple(map(lambda field: line[field].decode('utf-8'), AIRPORT_CAPACTIY_HEADERS))))
    connection.commit()

def import_datasets(connection):
    cursor = connection.cursor()

    DATASETS = [
        Dataset('2002-2006', ImportVersion.V1),
        Dataset('2007-2009', ImportVersion.V1),
        Dataset('2010-2013', ImportVersion.V2),
        Dataset('2014',      ImportVersion.V3),
        Dataset('2015',      ImportVersion.V3),
        Dataset('2016',      ImportVersion.V4),
        Dataset('2017',      ImportVersion.V5),
    ]

    cursor.execute("DROP TABLE IF EXISTS claim")
    cursor.execute("""
        CREATE TABLE `claim` (
            `id`            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
        	`claim_number`	INTEGER UNIQUE,
        	`date_received`	TEXT,
        	`incident_date`	TEXT,
        	`airport_code`	TEXT,
        	`airport_name`  TEXT,
        	`airline`    	TEXT,
        	`claim_type`	TEXT,
        	`claim_site`	TEXT,
        	`claim_amount`	REAL,
        	`status`        TEXT,
        	`close_amount`	REAL,
        	`disposition`	TEXT
        );
    """)

    cursor.execute("DROP TABLE IF EXISTS item")
    cursor.execute("""
        CREATE TABLE item(
          id     INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
          name   TEXT NOT NULL UNIQUE
        );
    """)

    cursor.execute("DROP TABLE IF EXISTS item_claim")
    cursor.execute("""
        CREATE TABLE item_claim(
          id    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
          item  INTEGER NOT NULL,
          claim INTEGER NOT NULL,
          FOREIGN KEY(item) REFERENCES item(id),
          FOREIGN KEY(claim) REFERENCES claim(id)
        );
    """)

    connection.commit()

    for dataset in DATASETS:
        print 'Importing {}'.format(dataset.get_name())
        dataset.insert_into_database(cursor)
        connection.commit()

if __name__ == '__main__':
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    import_airport_codes(connection)
    import_airport_capacities(connection)
    import_datasets(connection)

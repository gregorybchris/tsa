#!/usr/bin/env python

from collections import defaultdict
from datetime import datetime
from enum import Enum
import sqlite3
import csv

DATASETS_DIRECTORY = 'datasets'
DATABASE = 'tsa.db'
AIRPORT_CODES = 'airport-codes.csv'

DATASET_HEADERS = [
    'Claim Number',
    'Date Received',
    'Incident Date',
    'Airport Code',
    'Airport Name',
    'Airline Name',
    'Claim Type',
    'Claim Site',
    ['Item', 'Item Category'],
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

                self.__claim['Date Received'] = self.__get_date_received()
                self.__claim['Incident Date'] = self.__get_incident_date()
                self.__claim['Claim Amount'] = self.__convert_dollars_to_float(self.__get_value('Claim Amount'))
                self.__claim['Close Amount'] = self.__convert_dollars_to_float(self.__get_value('Close Amount'))
                self.__claim['Disposition'] = self.__claim['Disposition'].replace('*', '')

                self.__claim = {k: self.__clean(v) for k, v in self.__claim.iteritems()}


                cursor.execute(
            """
                        INSERT INTO claims
                        (claim_number, date_received, incident_date, airport_code,
                         airport_name, airline, claim_type, claim_site, item,
                         claim_amount, status, close_amount, disposition)
                        VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (tuple(map(lambda header: self.__get_value(header), DATASET_HEADERS))))

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
        for i, format_string in enumerate(format_strings):
            try:
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

    def __get_value(self, keys):
        if type(keys) != list:
            keys = [keys]
        for i, key in enumerate(keys):
            if self.__version != ImportVersion.V1:
                if key == 'Claim Amount' or key == 'Status':
                    return ''
            try:
                return self.__claim[key]
            except KeyError:
                pass
        raise KeyError

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

    cursor.execute("DROP TABLE IF EXISTS claims")
    cursor.execute("""
        CREATE TABLE `claims` (
        	`id`            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
        	`claim_number`	INTEGER UNIQUE,
        	`date_received`	TEXT,
        	`incident_date`	TEXT,
        	`airport_code`	TEXT,
        	`airport_name`  TEXT,
        	`airline`    	TEXT,
        	`claim_type`	TEXT,
        	`claim_site`	TEXT,
        	`item`         	TEXT,
        	`claim_amount`	REAL,
        	`status`	    TEXT,
        	`close_amount`	REAL,
        	`disposition`	TEXT
        );
    """)

    for dataset in DATASETS:
        print 'Importing {}'.format(dataset.get_name())
        dataset.insert_into_database(cursor)
        connection.commit()

if __name__ == '__main__':
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    import_airport_codes(connection)
    import_datasets(connection)

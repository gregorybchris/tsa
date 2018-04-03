#!/usr/bin/env python

from collections import defaultdict
from datetime import datetime
import sqlite3
import csv

def import_v5(filename, cursor):

    with open(filename) as f:
        reader = csv.reader(f, quotechar='"', delimiter=',',
                            quoting=csv.QUOTE_ALL, skipinitialspace=True)

        i = 0
        next(reader) # throw away header

        while True:

            line1 = ''
            line2 = ''
            data = ''

            try:
                line1 = next(reader)
            except StopIteration:
                break

            num = len(filter(lambda x: x != '', line1))


            if line1[0] == 'Claim Number':
                continue
            if not any(line1):
                continue
            if line1[0] == '':
                line2 = next(reader)
                claim_number = line2[0]
                data = next(reader)
            elif num == 1:
                try:
                    int(line1[0])
                    claim_number = line1[0]
                    data = next(reader)
                except ValueError:
                    line1 = ['', '', '', '', line1[0]]
                    line2 = next(reader)
                    claim_number = line2[0]
                    data = next(reader)
            elif num == 2:
                claim_number = line1[0]
                data = next(reader)
            else:
                claim_number = line1[0]
                data = line1

            if claim_number.strip() == '' or claim_number.strip() == '<BR>':
                continue

            date_received = ''
            if data[1] != '':
                date_received = datetime.strptime(data[1], '%d-%b-%y') \
                    .isoformat() \
                    .replace('T', ' ')

            incident_date = ''
            if data[2]:
                try:
                    incident_date = datetime \
                        .strptime(data[2], '%m/%d/%Y') \
                        .isoformat() \
                        .replace('T', ' ')
                except ValueError:
                    incident_date = datetime \
                        .strptime(data[2], '%m/%d/%Y %H:%M') \
                        .isoformat() \
                        .replace('T', ' ')

            airport_code = '' if data[3] == '-' else data[3]
            airport_name = " ".join([line1[4], data[4]]).strip()
            if airport_name == '-' or airport_name == '- -':
                airport_name = ''
            airline = '' if data[5] == '-' else data[5]
            claim_type = '' if data[6] == '-' else data[6]
            claim_site = '' if data[7] == '-' else data[7]
            item = '' if data[8] == '-' else data[8].decode('utf-8')

            close_amount = ''
            if data[9] != '' and data[9] != '-':
                close_amount = float(data[9].replace('$', '').replace(',', ''))

            disposition = '' if data[10] == '-' else data[10].replace('*', '')

            cursor.execute("""
                    INSERT INTO claims
                    (claim_number, date_received, incident_date, airport_code,
                     airport_name, airline, claim_type, claim_site, item,
                     claim_amount, status, close_amount, disposition)
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    claim_number,
                    date_received,
                    incident_date,
                    airport_code,
                    airport_name,
                    airline,
                    claim_type,
                    claim_site,
                    item,
                    '',
                    '',
                    close_amount,
                    disposition,
                ))

def import_v4(filename, cursor):

    with open(filename) as f:
        reader = csv.reader(f, quotechar='"', delimiter=',',
                            quoting=csv.QUOTE_ALL, skipinitialspace=True)

        i = 0
        next(reader) # throw away header


        while True:
            try:
                line1 = next(reader)
            except StopIteration:
                break

            if line1[0] == 'Claim Number':
                continue
            if line1[0] == '':
                data = next(reader)
                if data[0] == 'Claim Number':
                    continue
            else:
                data = line1

            claim_number = data[0]

            if claim_number.strip() == '' or claim_number.strip() == '<BR>':
                continue

            date_received = ''
            if data[1] != '':
                date_received = datetime.strptime(data[1], '%d-%b-%y') \
                    .isoformat() \
                    .replace('T', ' ')

            incident_date = ''
            if data[2]:
                try:
                    incident_date = datetime \
                        .strptime(data[2], '%m/%d/%Y') \
                        .isoformat() \
                        .replace('T', ' ')
                except ValueError:
                    incident_date = datetime \
                        .strptime(data[2], '%m/%d/%Y %H:%M') \
                        .isoformat() \
                        .replace('T', ' ')

            airport_code = data[3]
            airport_name = " ".join([line1[4], data[4]]).strip()
            airline = data[5]
            claim_type = data[6]
            claim_site = data[7]
            item = '' if data[8] == '-' else data[8]

            close_amount = ''
            if data[9] != '' and data[9] != '-':
                close_amount = float(data[9].replace('$', '').replace(',', ''))

            disposition = '' if data[10] == '-' else data[10].replace('*', '')

            cursor.execute("""
                    INSERT INTO claims
                    (claim_number, date_received, incident_date, airport_code,
                     airport_name, airline, claim_type, claim_site, item,
                     claim_amount, status, close_amount, disposition)
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    claim_number,
                    date_received,
                    incident_date,
                    airport_code,
                    airport_name,
                    airline,
                    claim_type,
                    claim_site,
                    item,
                    '',
                    '',
                    close_amount,
                    disposition,
                ))

def import_v4(filename, cursor):

    with open(filename) as f:
        reader = csv.reader(f, quotechar='"', delimiter=',',
                            quoting=csv.QUOTE_ALL, skipinitialspace=True)

        i = 0
        next(reader) # throw away header


        while True:
            try:
                line1 = next(reader)
            except StopIteration:
                break

            if line1[0] == 'Claim Number':
                continue
            if line1[0] == '':
                data = next(reader)
                if data[0] == 'Claim Number':
                    continue
            else:
                data = line1

            claim_number = data[0]

            if claim_number.strip() == '' or claim_number.strip() == '<BR>':
                continue

            date_received = ''
            if data[1] != '' and data[1] != '-':
                try:
                    date_received = datetime.strptime(data[1], '%d-%b-%y') \
                        .isoformat() \
                        .replace('T', ' ')
                except ValueError:
                    date_received = datetime.strptime(data[1], '%d/%b/%y') \
                        .isoformat() \
                        .replace('T', ' ')

            incident_date = ''
            if data[2]:
                try:
                    incident_date = datetime \
                        .strptime(data[2], '%m/%d/%Y') \
                        .isoformat() \
                        .replace('T', ' ')
                except ValueError:
                    try:
                        incident_date = datetime \
                            .strptime(data[2], '%m/%d/%Y %H:%M') \
                            .isoformat() \
                            .replace('T', ' ')
                    except ValueError:
                        incident_date = datetime \
                            .strptime(data[2], '%d-%b-%y') \
                            .isoformat() \
                            .replace('T', ' ')

            airport_code = data[3]
            airport_name = " ".join([line1[4], data[4]])
            airline = data[5]
            claim_type = data[6]
            claim_site = data[7]
            item = '' if data[8] == '-' else data[8]

            close_amount = ''
            if data[9] != '' and data[9] != '-':
                close_amount = float(data[9].replace('$', '').replace(',', ''))

            disposition = '' if data[10] == '-' else data[10].replace('*', '')

            cursor.execute("""
                    INSERT INTO claims
                    (claim_number, date_received, incident_date, airport_code,
                     airport_name, airline, claim_type, claim_site, item,
                     claim_amount, status, close_amount, disposition)
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    claim_number,
                    date_received,
                    incident_date,
                    airport_code,
                    airport_name,
                    airline,
                    claim_type,
                    claim_site,
                    item,
                    '',
                    '',
                    close_amount,
                    disposition,
                ))

def import_v3(filename, cursor):

    with open(filename) as f:
        for i, data in enumerate(csv.reader(f, quotechar='"', delimiter=',',
                     quoting=csv.QUOTE_ALL, skipinitialspace=True)):

            if i == 0:
                continue

            claim_number = data[0]

            if claim_number.strip() == '' or claim_number.strip() == '<BR>':
                continue

            date_received = ''
            if data[1] != '':
                date_received = datetime.strptime(data[1], '%d-%b-%y') \
                    .isoformat() \
                    .replace('T', ' ')

            incident_date = ''
            if data[2]:
                incident_date = datetime \
                    .strptime(data[2], '%d-%b-%y') \
                    .isoformat() \
                    .replace('T', ' ')

            airport_code = data[3]
            airport_name = data[4]
            airline = data[5]
            claim_type = data[6]
            claim_site = data[7]
            item = '' if data[8] == '-' else data[8]

            close_amount = ''
            if data[9] != '' and data[9] != '-':
                close_amount = float(data[9].replace('$', '').replace(',', ''))

            disposition = '' if data[10] == '-' else data[10]

            cursor.execute("""
                    INSERT INTO claims
                    (claim_number, date_received, incident_date, airport_code,
                     airport_name, airline, claim_type, claim_site, item,
                     claim_amount, status, close_amount, disposition)
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    claim_number,
                    date_received,
                    incident_date,
                    airport_code,
                    airport_name,
                    airline,
                    claim_type,
                    claim_site,
                    item,
                    '',
                    '',
                    close_amount,
                    disposition,
                ))

def import_v2(filename, cursor):

    with open(filename) as f:
        for i, data in enumerate(csv.reader(f, quotechar='"', delimiter=',',
                     quoting=csv.QUOTE_ALL, skipinitialspace=True)):

            if i == 0:
                continue

            claim_number = data[0]

            if claim_number.strip() == '' or claim_number.strip() == '<BR>':
                continue

            date_received = ''
            if data[1] != '':
                date_received = datetime.strptime(data[1], '%d-%b-%y') \
                    .isoformat() \
                    .replace('T', ' ')

            incident_date = ''
            if data[2]:
                try:
                    incident_date = datetime \
                        .strptime(data[2], '%m/%d/%y %H:%M') \
                        .isoformat() \
                        .replace('T', ' ')
                except ValueError:
                    incident_date = datetime \
                        .strptime(data[2], '%m/%d/%y') \
                        .isoformat() \
                        .replace('T', ' ')

            airport_code = data[3]
            airport_name = data[4]
            airline = data[5]
            claim_type = data[6]
            claim_site = data[7]
            item = '' if data[8] == '-' else data[8]

            close_amount = ''
            if data[9] != '' and data[9] != '-':
                close_amount = float(data[9].replace('$', '').replace(',', ''))

            disposition = '' if data[10] == '-' else data[10]

            cursor.execute("""
                    INSERT INTO claims
                    (claim_number, date_received, incident_date, airport_code,
                     airport_name, airline, claim_type, claim_site, item,
                     claim_amount, status, close_amount, disposition)
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    claim_number,
                    date_received,
                    incident_date,
                    airport_code,
                    airport_name,
                    airline,
                    claim_type,
                    claim_site,
                    item,
                    '',
                    '',
                    close_amount,
                    disposition,
                ))


def import_v1(filename, cursor):
    with open(filename) as f:
        for i, data in enumerate(csv.reader(f, quotechar='"', delimiter=',',
                     quoting=csv.QUOTE_ALL, skipinitialspace=True)):

            if i == 0:
                continue

            claim_number = data[0]

            date_received = ''
            if data[1] != '':
                date_received = datetime.strptime(data[1], '%d-%b-%y') \
                    .isoformat() \
                    .replace('T', ' ')

            incident_date = ''
            if data[2] != '':
                try:
                    incident_date = datetime \
                        .strptime(data[2], '%m/%d/%y %H:%M') \
                        .isoformat() \
                        .replace('T', ' ')
                except ValueError:
                    try:
                        incident_date = datetime \
                            .strptime(data[2], '%d-%b-%y00 %H:%M') \
                            .isoformat() \
                            .replace('T', ' ')
                    except ValueError:
                        try:
                            incident_date = datetime \
                                .strptime(data[2], '%d-%b-02%y %H:%M') \
                                .isoformat() \
                                .replace('T', ' ')
                        except ValueError:
                            try:
                                incident_date = datetime \
                                    .strptime(data[2], '%d-%b-00%y %H:%M') \
                                    .isoformat() \
                                    .replace('T', ' ')
                            except ValueError:
                                incident_date = datetime \
                                    .strptime(data[2], '%d-%b-10%y %H:%M') \
                                    .isoformat() \
                                    .replace('T', ' ')

            airport_code = data[3]
            airport_name = data[4]
            airline = data[5]
            claim_type = data[6]
            claim_site = data[7]
            item = '' if data[8] == '-' else data[8]

            claim_amount = ''
            if data[9] != '':
                claim_amount = float(data[9].replace('$', '').replace(',', ''))

            status = data[10]

            close_amount = ''
            if data[11] != '':
                close_amount = float(data[11].replace('$', '').replace(',', ''))

            disposition = '' if data[12] == '-' else data[12]

            cursor.execute("""
                    INSERT INTO claims
                    (claim_number, date_received, incident_date, airport_code,
                     airport_name, airline, claim_type, claim_site, item,
                     claim_amount, status, close_amount, disposition)
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    claim_number,
                    date_received,
                    incident_date,
                    airport_code,
                    airport_name,
                    airline,
                    claim_type,
                    claim_site,
                    item,
                    claim_amount,
                    status,
                    close_amount,
                    disposition,
                ))


if __name__ == '__main__':
    connection = sqlite3.connect('tsa.db')
    connection.row_factory = sqlite3.Row

    connection.cursor().execute("DROP TABLE IF EXISTS claims")
    connection.cursor().execute("""
        CREATE TABLE `claims` (
        	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
        	`claim_number`	INTEGER UNIQUE,
        	`date_received`	TEXT,
        	`incident_date`	TEXT,
        	`airport_code`	TEXT,
        	`airport_name` TEXT,
        	`airline`	TEXT,
        	`claim_type`	TEXT,
        	`claim_site`	TEXT,
        	`item`	TEXT,
        	`claim_amount`	REAL,
        	`status`	TEXT,
        	`close_amount`	REAL,
        	`disposition`	TEXT
        );
    """)
    connection.commit()

    import_v1('raw/2002-2006.csv', connection.cursor())
    import_v1('raw/2007-2009.csv', connection.cursor())
    import_v2('raw/2010-2013.csv', connection.cursor())
    import_v3('raw/2015.csv', connection.cursor())
    import_v4('raw/2016.csv', connection.cursor())
    import_v5('raw/2017.csv', connection.cursor())
    connection.commit()

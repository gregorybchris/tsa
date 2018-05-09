#!/usr/bin/env python

from collections import defaultdict
from datetime import datetime
from enum import Enum
from fuzzywuzzy import fuzz
import sqlite3
import csv
import re
import statistics

DATABASE = '../../wrangling/zach/tsa.db'

if __name__ == "__main__":
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()

    # dictionary from airport to
    new_category = {}

    with open('categories.csv') as f:
        reader = csv.DictReader(f, quotechar='"', delimiter=',',
                                quoting=csv.QUOTE_ALL, skipinitialspace=True)
        for line in reader:
            new_category[line['Item Name']] = line['Category']

    cursor.execute("""
        SELECT DISTINCT airport_code from claim
    """)

    for result in cursor.fetchall():
        airport_code = result['airport_code']
        if not airport_code:
            continue
        print airport_code
        cursor.execute("""
            SELECT id, claim_number, date_received, incident_date, airport_code, airport_name, airline, claim_type, claim_site, claim_amount, items, status, close_amount, disposition FROM claim x
            INNER JOIN (
                SELECT claim, group_concat(name, "*") as items FROM item_claim
                INNER JOIN item on item.id = item_claim.item
                GROUP BY claim
            ) y
            ON x.id = y.claim
            WHERE airport_code = ?
            AND (claim_type like "%Property Loss%" OR claim_type like "%Theft%")
        """,
        (airport_code,))
        with open('data/{}.tsv'.format(airport_code), 'w') as g:
            g.write('\t'.join([
                'id',
                'claim_number',
                'date_received',
                'incident_date',
                'airport_code',
                'airport_name',
                'airline',
                'claim_type',
                'claim_site',
                'claim_amount',
                'items_new',
                'items_old',
                'status',
                'close_amount',
                'disposition',
            ]))
            for claim in cursor.fetchall():
                to_write = [
                    claim['id'],
                    claim['claim_number'],
                    claim['date_received'],
                    claim['incident_date'],
                    claim['airport_code'],
                    claim['airport_name'],
                    claim['airline'],
                    claim['claim_type'],
                    claim['claim_site'],
                    claim['claim_amount'],
                    ','.join(map(lambda old: new_category[old], claim['items'].split('*'))),
                    claim['items'],
                    claim['status'],
                    claim['close_amount'],
                    claim['disposition'],
                ]
                g.write('\n')
                g.write('\t'.join(map(lambda x: str(x), to_write)))

    exit(0)

    with open('categories.csv') as f:
        reader = csv.DictReader(f, quotechar='"', delimiter=',',
                                quoting=csv.QUOTE_ALL, skipinitialspace=True)

        for line in reader:
            # for each actual item category
            cursor.execute("""
                SELECT airport_code, COUNT(*) as count FROM claim x
                INNER JOIN (
                	SELECT * FROM item_claim
                	INNER JOIN item ON item.id = item_claim.item
                	WHERE item.name = ?
                ) y
                WHERE x.id = y.claim
                GROUP BY airport_code
            """, (line['Item Name'],))
            for result in cursor.fetchall():
                if not result['airport_code']:
                    continue
                airports[result['airport_code']][line['Category']] += result['count']
    for code, airport in airports.iteritems():
        for category in airport:
            print category

    new_categories = [
        'Food & Drink',
        'Clothing & Accessories',
        'Household Items',
        'Other',
        'Cosmetics',
        'Outdoors Supplies',
        'Watches & Jewelry',
        'Supplies',
        'Electronics',
        'Containers',
        'Tools & Machines',
    ]

    to_write = {}
    for new in new_categories:
        this_category = {}
        for code, airport in airports.iteritems():
            this_category[code] = airport[new]
        to_write[new] = this_category
    print to_write

    import pandas as pd
    df = pd.DataFrame(to_write)
    df.to_csv('items_by_airport.csv')
    exit(0)


    cursor.execute("""
        SELECT name, airport_capacities.domestic_passengers, airport_capacities.international_passengers, y.airport_code, coordinates, total_claims FROM airport_codes x
        INNER JOIN (
            SELECT airport_code, COUNT(*) as total_claims
            FROM claim
            WHERE airport_code != ''
            AND (claim_type = 'Passenger Property Loss' or claim_type = 'Property Loss')
            GROUP BY airport_code
        ) y
        on x.local_code = y.airport_code
        LEFT JOIN airport_capacities on airport_capacities.airport_code = y.airport_code
        WHERE iso_country = 'US'
    """)
    results = cursor.fetchall()
    for i, result in enumerate(results):
        print '{}'.format(i + 1)
        lat, lng = result['coordinates'].split(', ')
        name = result['name'].encode('utf-8')

        cursor.execute("""
            SELECT claim_amount, close_amount FROM claim
            WHERE airport_code = ?
            AND (claim_type like "%Property Loss%" OR claim_type like "%Theft%")
        """, (result['airport_code'],))
        results = cursor.fetchall()

        if len(results) == 0:
            continue

        try:
            med_claim = round(statistics.median(x['claim_amount'] for x in results if x['claim_amount']), 2)
        except statistics.StatisticsError:
            med_claim = -1
        try:
            med_close = round(statistics.median(x['close_amount'] for x in results if x['close_amount']), 2)
        except statistics.StatisticsError:
            med_claim = -1

        domestic_passengers = result['domestic_passengers'] or 0
        international_passengers = result['international_passengers'] or 0

        row = '{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}'.format(name, domestic_passengers, international_passengers, lat, lng, result['total_claims'], med_claim, med_close)
        rows.append(row)

    with open('data.tsv', 'w') as f:
        f.write("\n".join(rows))



    exit(0)
    cursor.execute("""
        SELECT DISTINCT iso_region FROM airport_codes WHERE iso_country = 'US'
    """)
    states = cursor.fetchall()

    for state in states:
        cursor.execute("""
            SELECT item.name, COUNT(*) as item_count
            FROM item_claim
            INNER JOIN item ON item_claim.item = item.id
            INNER JOIN claim ON item_claim.claim = claim.id
            INNER JOIN airport_codes ON claim.airport_code = airport_codes.local_code
            WHERE claim.airport_code != '' AND airport_codes.iso_region = ? AND item.name != 'Other'
            GROUP BY item.name
            ORDER BY item_count DESC
            LIMIT 1
        """, (state['iso_region'],))
        print state, cursor.fetchone()

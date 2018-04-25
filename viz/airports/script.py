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

    rows = ['\t'.join(['Airport', 'lat', 'lng', 'count', 'med_claim', 'med_close'])]
    cursor.execute("""
        SELECT name, airport_code, coordinates, total_claims FROM airport_codes x
        INNER JOIN (
            SELECT airport_code, COUNT(*) as total_claims
            FROM claim
            WHERE airport_code != ''
            AND (claim_type = 'Passenger Property Loss' or claim_type = 'Property Loss')
            GROUP BY airport_code
        ) y
        on x.local_code = y.airport_code
        WHERE iso_country = 'US'
    """)
    results = cursor.fetchall()
    for i, result in enumerate(results):
        print '{}/{}'.format(i + 1, len(results))
        lat, lng = result['coordinates'].split(', ')
        name = result['name'].encode('utf-8')

        cursor.execute("""
            SELECT claim_amount, close_amount FROM claim
            WHERE airport_code = ?
            AND (claim_type = 'Passenger Property Loss' or claim_type = 'Property Loss')
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

        row = '{}\t{}\t{}\t{}\t{}\t{}'.format(name, lat, lng, result['total_claims'], med_claim, med_close)
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

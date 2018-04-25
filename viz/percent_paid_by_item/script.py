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

    cursor.execute("""
        SELECT * FROM item
    """)
    items = cursor.fetchall()

    rows = ['Item\tRatio']
    for i, item in enumerate(items):
        cursor.execute("""
            SELECT COUNT(*) as count, close_amount, claim_amount
            FROM claim
            INNER JOIN item_claim on claim.id = item_claim.claim
            WHERE item = ? and close_amount NOT LIKE '' and claim_amount NOT LIKE '' and close_amount IS NOT NULL and claim_amount IS NOT NULL
        """, (item['id'],))
        results = cursor.fetchall()
        if results[0]['count'] < 25:
            print 'SKIPPING ' + item['name']
            continue
        print str(i) + "/" + str(len(items))
        try:
            med_claim = round(statistics.median(x['claim_amount'] for x in results), 2)
            med_close = round(statistics.median(x['close_amount'] for x in results), 2)
        except statistics.StatisticsError:
            continue
        rows.append("\t".join([
            item['name'],
            #str(med_claim),
            str(med_close / med_claim),
        ]))

    with open('data2.tsv', 'w') as f:
        f.write("\n".join(rows))

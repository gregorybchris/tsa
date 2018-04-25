#!/usr/bin/env python

from collections import defaultdict
from datetime import datetime
from enum import Enum
from fuzzywuzzy import fuzz
import sqlite3
import csv
import re

DATABASE = '../../wrangling/zach/tsa.db'

if __name__ == "__main__":
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()

    cursor.execute("""
        SELECT DISTINCT claim_type from claim
    """)
    types = [item[0] for item in cursor.fetchall() if item[0] and "/Personal" not in item[0] and item[0] != "Not Provided"]

    cursor.execute("""
        SELECT DISTINCT claim_site from claim
    """)
    sites = [item[0] for item in cursor.fetchall() if item[0] and item[0] != "Not Provided"]

    rows = [",".join(["Claim Type"] + sites)]
    for claim_type in types:
        counts = []
        for site in sites:
            cursor.execute("""
                SELECT COUNT(*)
                FROM claim
                WHERE claim_type = ? AND claim_site = ?
            """, (claim_type, site))
            count = cursor.fetchone()[0]
            counts.append(str(count))
        row = ",".join([claim_type] + counts)
        rows.append(row)

    with open('data2.csv', 'w') as f:
        f.write("\n".join(rows))

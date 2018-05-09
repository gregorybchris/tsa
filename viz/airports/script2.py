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
    total_passengers = 1645028161
    total_count = 126767
    claim_amounts = []
    close_amounts = []

    cursor.execute("""
        SELECT * FROM claim
        WHERE (claim_type = 'Passenger Property Loss' or claim_type = 'Property Loss' or claim_type LIKE '%Theft%')
        AND claim_amount IS NOT NULL and claim_amount != '' AND claim_amount != 0
        ORDER BY claim_amount
    """)
    results = cursor.fetchall()
    print "Median Claim:", results[len(results)/2]['claim_amount']
    cursor.execute("""
        SELECT * FROM claim
        WHERE (claim_type = 'Passenger Property Loss' or claim_type = 'Property Loss' or claim_type LIKE '%Theft%')
        AND close_amount IS NOT NULL and close_amount != '' AND close_amount != 0
        ORDER BY close_amount
    """)
    results = cursor.fetchall()
    print "Median Close:", results[len(results)/2]['close_amount']

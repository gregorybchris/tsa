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
    """
    with open('stacked2.tsv', 'r') as f:
        with open('stacked4.tsv', 'w') as g:
            g.write('date\tApprove\tSettle\tDeny\n')
            for line in f:
                row = line.strip().split('\t')
                row[0] = str(float(row[0]) * 10)
                total_num_claims = sum(int(x) for x in row[1:])
                if total_num_claims == 0:
                    continue
                for i, item in enumerate(row):
                    if i == 0:
                        continue
                    if total_num_claims == 0:
                        row[i] = "0"
                    else:
                        row[i] = str(round(float(item) / total_num_claims * 100, 2))
                rowStr = "\t".join(row)
                g.write(rowStr + '\n')
    exit(0)
    """
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()

    rows = []

    with open('stacked10.tsv', 'w+') as f:
        f.write('claim_amount\tApprove\tSettle\tDeny\n')
        f.write("\n".join(rows))
        for i in xrange(151):
            row = [str((i+1)*10)]
            for disposition in ['Approve in Full', 'Settle', 'Deny']:
                cursor.execute("""
                    SELECT COUNT(disposition) FROM claim
                    WHERE
                        claim_amount IS NOT NULL
                        AND disposition IS NOT NULL
                        AND claim_amount not like ''
                        AND disposition not like ''
                        AND (claim_type like "%Property Loss%" OR claim_type like "%Theft%")
                        AND claim_amount > ?
                        AND claim_amount <= ?
                        AND disposition == ?
                """, (i*10, (i+1)*10, disposition))
                row.append(str(cursor.fetchall()[0][0]))
            rowStr = '\t'.join(row)
            rows.append(rowStr)
            if i % 10 == 0:
                print "{} / {}".format(i, 150)
                print rows
                f.write("\n".join(rows))
                f.write('\n')
                f.flush()
                rows = []

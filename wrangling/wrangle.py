import csv
from plotter import plot_airlines

def clean_split_airport_lines():
    processed_rows = []
    features = []

    with open("data/claims16pre.csv", "r") as input_file:
        reader = csv.reader(input_file, delimiter=",", quotechar="\"")
        rows = list(reader)
        features = rows[0]
        rows = rows[1:]

        airport_name_save = ""
        for i, row in enumerate(rows):
            if not row[0]:
                if not row[4]:
                    airport_name_save = ""
                else:
                    airport_name_save = row[4]
            else:
                if row[0] == "Claim Number":
                    airport_name_save = ""
                else:
                    row[4] = airport_name_save + " " + row[4]
                    processed_rows.append(row)

        print(processed_rows[:4])

    with open("data/claims16post.csv", "w") as output_file:
        writer = csv.writer(output_file, delimiter=",", quotechar="\"", quoting=csv.QUOTE_MINIMAL)
        writer.writerow(features)
        for row in processed_rows:
            writer.writerow(row)


def clean_csv_whitespace():
    processed_rows = []
    with open("data/alldata.csv", "r") as input_file:
        reader = csv.reader(input_file, delimiter=",", quotechar="\"")
        rows = list(reader)
        processed_rows = [[val.strip() for val in row] for row in rows]

    with open("data/alldataout.csv", "w") as output_file:
        writer = csv.writer(output_file, delimiter=",", quotechar="\"", quoting=csv.QUOTE_MINIMAL)
        for row in processed_rows:
            writer.writerow(row)


def analyze_rows():
    with open("data/alldata.csv", "r") as input_file:
        reader = csv.reader(input_file, delimiter=",", quotechar="\"")
        rows = list(reader)
        features = rows[0]
        print("Num Rows: ", len(rows))
        print(features)
        rows = rows[1:]
        feature_ids = { feature: i for i, feature in enumerate(features) }

        num_no_date_received = 0
        num_no_airport = 0
        num_no_airline = 0
        num_no_close_amount = 0
        claim_types = {}
        airlines = {}
        for row in rows:
            if not row[feature_ids["Date Received"]]:
                num_no_date_received += 1
            if not row[feature_ids["Airport Name"]]:
                num_no_airport += 1
            if not row[feature_ids["Airline Name"]]:
                num_no_airline += 1
            if not row[feature_ids["Close Amount"]]:
                num_no_close_amount += 1

            claim_type = row[feature_ids["Claim Type"]]
            if claim_type not in claim_types:
                claim_types[claim_type] = 1
            else:
                claim_types[claim_type] += 1

            airline = row[feature_ids["Airline Name"]]
            if airline not in airlines:
                airlines[airline] = 1
            else:
                airlines[airline] += 1

        print("Claim Types: ", claim_types)
        print("Airlines: ", airlines)

        print("Num no date received: ", num_no_date_received)
        print("Num no airport: ", num_no_airport)
        print("Num no airline: ", num_no_airline)
        print("Num no close amount: ", num_no_close_amount)


def create_full_dataset():
    keep_fields = ["Claim Number", "Date Received", "Airport Code", "Airport Name", "Airline Name", "Claim Type", "Close Amount"]

    features = []
    processed_rows = []
    with open("data/alldata.csv", "r") as input_file:
        reader = csv.reader(input_file, delimiter=",", quotechar="\"")
        rows = list(reader)
        features = rows[0]
        print("Num Rows: ", len(rows))
        print(features)
        rows = rows[1:]
        feature_ids = { feature: i for i, feature in enumerate(features) }

        for row in rows:
            processed_row = []
            for field in keep_fields:
                if row[feature_ids[field]] and row[feature_ids[field]] != "-":
                    processed_row.append(row[feature_ids[field]])
            if len(processed_row) == len(keep_fields):
                processed_rows.append(processed_row)


    with open("data/filtered16.csv", "w") as output_file:
        writer = csv.writer(output_file, delimiter=",", quotechar="\"", quoting=csv.QUOTE_MINIMAL)
        writer.writerow(keep_fields)
        for row in processed_rows:
            writer.writerow(row)


if __name__ == "__main__":
    # clean_split_airport_lines()
    # clean_csv_whitespace()
    # analyze_rows()
    # create_full_dataset()

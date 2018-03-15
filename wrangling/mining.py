import csv
import json
from plotter import plot_bar


''' Pull data from the given CSV file '''
def get_data(filepath):
    with open(filepath, "r") as input_file:
        reader = csv.reader(input_file, delimiter=",", quotechar="\"")
        entries = list(reader)
        columns, entries = entries[0], entries[1:]
        return (columns, entries)


''' Returns a dictionary that returns the index of a column for a CSV file given a column name '''
def build_column_lookup(csv_data):
    columns, entries = csv_data
    return { column: i for i, column in enumerate(columns) }


''' Turns a dictionary that maps names -> counts into two lists sorted by the counts '''
def count_dict_to_sorted_lists(d):
    to_list = list(d.items())
    to_list.sort(key=lambda t: -1 * t[1])
    return (list(part) for part in zip(*to_list))


''' Plots a barchart of the number of claims per airline for the top airlines '''
def plot_airline_claim_counts(data, num_airlines):
        columns, entries = data
        column_lookup = build_column_lookup(data)
        # Create a dictionary: airline -> number of claims
        als = {}
        for entry in entries:
            al = entry[column_lookup["Airline Name"]]
            als[al] = als[al] + 1 if al in als else 1
        # Break that dictionary into two lists sorted by number of claims
        names, counts = count_dict_to_sorted_lists(als)
        # Take "airline" out of airline names for readability
        names = [name.replace(" Airlines", "").replace(" Air Lines", "") for name in names]
        # Plot that data
        plot_bar(names[:num_airlines], counts[:num_airlines], "TSA Claims Since 2002")


''' Returns a dictionary from airport codes to airport names from CSV data'''
def build_code_lookup(csv_data):
    columns, entries = csv_data
    code_column_lookup = build_column_lookup(csv_data)
    code_lookup = {}
    for entry in entries:
        airport_code = entry[code_column_lookup["Airport Code"]]
        airport_name = entry[code_column_lookup["Airport Name"]]
        code_lookup[airport_code] = airport_name
    return code_lookup


''' Takes two CSV filenames with the same columns and returns the merged data '''
def merge_two_csvs(filepath_1, filepath_2):
    columns_1, entries_1 = get_data(filepath_1)
    columns_2, entries_2 = get_data(filepath_2)
    assert(columns_1 == columns_2)
    all_entries = entries_1 + entries_2
    return (columns_1, all_entries)


''' Prints the airports in the TSA data not found in a given list of airports '''
def count_unknown_airports(data, codes):
    columns, entries = data
    data_column_lookup = build_column_lookup(data)
    codes_lookup = build_code_lookup(codes)
    uaps = {}
    for entry in entries:
        airport_code = entry[data_column_lookup["Airport Code"]]
        airport_name = entry[data_column_lookup["Airport Name"]]
        if airport_code not in codes_lookup:
            if airport_code != "F":
                uaps[airport_name] = uaps[airport_name] + 1 if airport_name in uaps else 1
    names, counts = count_dict_to_sorted_lists(uaps)
    print("Unknown Airports: ", names, counts)
    print(sum(counts))


''' Writes a python object to a file in JSON format '''
def dump_to_json(filepath, data):
    with open(filepath, "w") as output_file:
        json.dump(data, output_file)


''' Converts CSV data to a list of dict records '''
def csv_data_to_records(data):
    columns, entries = data
    return [dict(zip(columns, entry)) for entry in entries]


if __name__ == "__main__":
    datafile = "data/tsa-data.csv"
    data = get_data(datafile)
    # plot_airline_claim_counts(data, 12)

    # us_codefile = "data/us-airport-codes.csv"
    # intl_codefile = "data/intl-airport-codes.csv"
    # airport_codes = merge_two_csvs(us_codefile, intl_codefile)
    # count_unknown_airports(data, airport_codes)

    dump_to_json("data/tsa-data.json", csv_data_to_records(data))

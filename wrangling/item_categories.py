from mining import get_data, build_column_lookup

items_data = get_data('./item.csv')
items_columns, items_entries = items_data
# items_lookup = build_column_lookup(items_data)
categories_data = get_data('./categories.csv')
categories_columns, categories_entries = categories_data
# categories_lookup = build_column_lookup(categories_data)

# ['id', 'name'] items
# ['Item Name', 'Category'] categories

# ['Item ID', 'Category']

categories_table = []
for item in items_entries:
    for category in categories_entries:
        if category[0] == item[1]:
            categories_table.append([item[0], category[1]])

print(categories_table)

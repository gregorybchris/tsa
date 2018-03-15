from matplotlib.ticker import FuncFormatter
import matplotlib.pyplot as plt
import numpy as np

def plot_airlines(names, counts, title):
    x = np.arange(len(names))
    fig, ax = plt.subplots()
    plt.bar(x, counts)
    plt.title(title)
    plt.xticks(x, tuple(names))
    plt.show()

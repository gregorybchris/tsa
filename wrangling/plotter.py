from matplotlib.ticker import FuncFormatter
import matplotlib.pyplot as plt
import numpy as np

def plot_bar(x, y, title):
    x_steps = np.arange(len(x))
    fig, ax = plt.subplots()
    plt.bar(x_steps, y)
    plt.title(title)
    plt.xticks(x_steps, tuple(x))
    plt.show()

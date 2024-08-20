# Ecosystem Simulator

<img width="1488" alt="image" src="https://github.com/user-attachments/assets/fbf4b62d-4a6f-4f27-b3f2-833aec1f3721">

## Demo
Check out the live demo [here](https://peancored.github.io/ecosystem-sim/).

## Overview
This is a WebGL-based ecosystem simulator inspired by Sebastian Lague. The project explores how evolution plays out in a simple simulation, where bunnies interact with their environment based on basic survival needs.

## How It Works
- **Basic Needs:** Each bunny in the simulation has three primary needs—eating, drinking, and mating.
- **Randomized Traits:** Bunnies come with random parameters like speed, max age, sex, egg count, and thresholds for when they start searching for food and water.
- **Textures:** Each bunny is randomly assigned a texture (3 female and 3 male textures available).
- **Reproduction:** When two bunnies mate, they produce offspring that inherit traits from both parents, including speed, egg count, and textures.
- **Behavior:** Bunnies will spot food, water, or potential mates from a distance and run toward them when their corresponding needs get low. Males signal females to stop when they want to mate, and if successful, pregnancy begins.
- **Natural Selection:** Over time, weaker bunnies tend not to survive, and the population typically stabilizes at around 100-200 bunnies, also becoming more homogeneous, demonstrating natural selection in action.
- **Interactive Stats:** You can click on any bunny to check out its individual stats.

## How to Run
Simply open the project in your browser and let the simulation run. Observe how the population evolves and stabilizes over time.

## Technologies Used
- **WebGL**: For rendering the ecosystem and simulating the bunnies' behaviors.
- **JavaScript**: For handling the logic and interactions within the simulation.

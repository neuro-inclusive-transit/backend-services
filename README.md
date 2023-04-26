<!-- deno-lint-ignore-file -->

# MVP: Backend Services

im Rahmen des Moduls

**Projekt 2**\
im Medieninformatik Master\
Schwerpunkt Human-Computer Interaction\
Technische Hochschule Köln\
Campus Gummersbach

## Introduction

This repository contains the backend services for the MVP of the project. Each
service is implemented as a Docker container. The following services are
available:

- ChallengeAPI
- DisturbanceAPI
- RouteAPI

Each Service has a runtime of Deno. They all share the same deno.json and
import_map.json files, which are loaded into the container at runtime. The
following ports are used:

- ChallengeAPI: `3000`
- ChallengeAPI-Database: `3307`
- DisturbanceAPI: `3001`
- DisturbanceAPI-Database: `3308`
- RouteAPI: `3002`
- RouteAPI-Database: `3306`
- MQTT-Broker: `1883`

## Installation

The following requirements must be met:

- **Docker**: Make sure Docker Desktop is installed (Includes: Dekstop, CLI and
  Compose) &rarr; <https://www.docker.com/>

To launch the application, perform the following steps:

1. clone repository
2. duplicate the `.env.example` file and rename it to `.env` (Bash-Befehl:
   `cp .env.example .env`)
3. fill in the missing values in the `.env` file
4. run `docker compose up --build` in the root directory of the project
5. close the application with `CTRL + C`

## Contributing

Make sure the following requirements are met:

- **Docker**: Make sure Docker Desktop is installed (Includes: Dekstop, CLI and
  Compose) &rarr; <https://www.docker.com/>
- **VSCode** (Optional): Make sure VSCode is installed and the recommended
  plugins are installed &rarr; <https://code.visualstudio.com/>
- **GitHub Copilot** (Optional): Make sure you have access to GitHub Copilot
  &rarr; <https://copilot.github.com/>

To launch the application, perform the following steps:

1. clone repository
2. run `docker compose up -d` in the root directory of the project (runs in
   background/detached mode)
3. open the project in VSCode
4. perform changes
5. run `docker compose restart` in the root directory of the project to see
   changes
6. commit changes

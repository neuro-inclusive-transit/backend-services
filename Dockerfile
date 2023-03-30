FROM denoland/deno:1.32.1

WORKDIR /app

# Prefer not to run as root.
USER deno

ADD . .

# tbd. run File

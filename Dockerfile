FROM denoland/deno:1.32.3

ARG SERVICE_NAME

WORKDIR /app

# Prefer not to run as root.
USER deno

ADD --chown=deno:deno ./deno.json .
ADD --chown=deno:deno ./import_map.json .

# copy code of service
ADD --chown=deno:deno ./${SERVICE_NAME} .

# run
CMD deno run --allow-net --allow-env main.ts


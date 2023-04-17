FROM denoland/deno:1.32.3

ARG SERVICE_NAME

WORKDIR /app

# copy code of service
COPY ./${SERVICE_NAME} ./${SERVICE_NAME}
COPY ./deno.json ./import_map.json ./

ENV SERVICE_NAME=${SERVICE_NAME}

RUN deno cache --unstable --import-map=import_map.json ./${SERVICE_NAME}/main.ts

# run
CMD deno run -A ./${SERVICE_NAME}/main.ts

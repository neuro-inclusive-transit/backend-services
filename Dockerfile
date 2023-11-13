FROM denoland/deno:1.38.1

ARG SERVICE_NAME

WORKDIR /app

# copy code of service
COPY ./deno.json ./import_map.json ./
COPY ./common ./common
COPY ./${SERVICE_NAME} ./service

ENV SERVICE_NAME=${SERVICE_NAME}

RUN deno cache --unstable --import-map=import_map.json ./service/main.ts

# run
ENTRYPOINT ["deno", "run", "-A", "./service/main.ts"]

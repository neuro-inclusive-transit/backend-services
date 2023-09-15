FROM denoland/deno:1.36.4

ARG SERVICE_NAME

WORKDIR /app

# copy code of service
COPY ./${SERVICE_NAME} ./${SERVICE_NAME}
COPY ./deno.json ./import_map.json ./

ENV SERVICE_NAME=${SERVICE_NAME}

RUN deno cache --unstable --import-map=import_map.json ./${SERVICE_NAME}/main.ts
RUN deno test --unstable --allow-env ./${SERVICE_NAME}/test.ts

# run
CMD deno run -A ./${SERVICE_NAME}/main.ts

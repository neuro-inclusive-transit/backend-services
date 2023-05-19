import mqtt from "mqtt";
import { Application } from "oak/mod.ts";

const BROKER_HOST = Deno.env.get("BROKER_HOST") || "localhost";
const BROKER_PORT = Deno.env.get("BROKER_PORT") || "1883";

const PORT = Deno.env.get("PORT") ? parseInt(Deno.env.get("PORT")!) : 3306;

const client = mqtt.connect(`mqtt://${BROKER_HOST}:${BROKER_PORT}`);

client.on("connect", () => {
  client.subscribe("presence", function (err) {
    if (!err) {
      client.publish("presence", "Hello mqtt");
    }
  });
});

client.on("message", (_, message) => {
  console.log(message.toString());
});

client.on("error", (error) => {
  console.log(error);
});

const app = new Application();

app.use(async (ctx) => {
  ctx.response.body = "Hello World!";
});

await app.listen({ port: PORT });

import { createClient } from "redis";

const redisClient = createClient({
  url: "redis://localhost:6379" // Change if using Docker with different host
});

redisClient.on("error", (err) => console.error("Redis Error:", err));

await redisClient.connect();

export default redisClient;

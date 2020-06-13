// worker.js

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const helloWorld = async (params) => {
  // heavy computing goes here
  console.log("starting webworker script");
  await timeout(5000);
  console.log("done with webworker script");

  return "worker done message";
};

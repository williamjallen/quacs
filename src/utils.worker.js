// worker.js

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const helloWorld = async (params) => {
  let i=0;
  // heavy computing goes here
  let start = new Date().getTime();
  while(new Date().getTime() - start < 4000){
    i++;
  }

  return "worker done message "+i;
};

let interval;

exports.start = async () => {
  interval = setInterval(() => {
    console.log(Date.now());
  }, 1000);
};
exports.close = () => {
  clearInterval(interval);
  return Promise.resolve();
};

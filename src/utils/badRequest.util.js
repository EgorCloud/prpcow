module.exports = (err) => ({
  type: "error",
  status: err.status || 500,
  error: {
    name: err.name,
    message: err.message,
  },
});

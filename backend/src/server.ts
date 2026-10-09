import app from "./app";

const PORT = Number(process.env.PORT || 8080);

// Start listening only from this entry point.
app.listen(PORT, (): void => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

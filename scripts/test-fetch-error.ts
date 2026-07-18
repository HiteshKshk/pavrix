async function testFetch() {
  try {
    await fetch("https://thisdomaindefinitelydoesnotexist12345.com");
  } catch (err: any) {
    console.log("Error object keys:", Object.keys(err));
    console.log("Error message:", err.message);
    console.log("Error code:", err.code);
    console.log("Error cause:", err.cause);
    if (err.cause) {
      console.log("Cause code:", err.cause.code);
      console.log("Cause errno:", err.cause.errno);
    }
  }
}

testFetch();

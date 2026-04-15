const { checkSMTP } = require("./Backend/validators/smtp");

async function test() {
  const email = "invalid-test-dsafjklsdhfjklsdhfjkls@gmail.com";
  console.log(`Checking ${email}...`);
  const result = await checkSMTP(email);
  console.log(result);
}

test();

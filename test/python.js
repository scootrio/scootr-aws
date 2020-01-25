const { compute, application, http } = require('scootr');
const { driver, enums } = require('../lib/index');

const code1 = `import json

def endpoint(event, context):
    return {
      "statusCode": 200,
      "body": json.dumps({
        "message": "Hello from code one!"
      })
    }
`;

const code2 = `import json

def endpoint(event, context):
    return {
      "statusCode": 200,
      "body": json.dumps({
        "message": "Hello from code two!"
      })
    }
`;

(async function() {
  const app = application('MyPythonApplication')
    .with(
      compute('MyFirstCompute')
        .runtime(enums.Runtimes.Python_3_8)
        .code(code1)
        .tag('stage', 'dev')
        .tag('product', 'x')
        .on(
          http('MyGetEvent')
            .method('GET')
            .path('/event')
        )
    )
    .with(
      compute('MySecondCompute')
        .runtime(enums.Runtimes.Python_3_8)
        .code(code2)
        .on(
          http('MyPostEvent')
            .method('POST')
            .path('/event')
        )
    );

  try {
    const result = await app.deploy(driver, enums.Regions.UsWest2);
    console.log(result);
  } catch (err) {
    console.error(err);
  }
})();

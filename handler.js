const { spawnSync } = require("child_process");
const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();

module.exports.mkvideo = async (event, context) => {

  // check if triggerd from s3
  if (!event.Records) {
    console.log("not an s3 invocation!");
    return;
  }
  for (const record of event.Records) {

    // check if triggerd from s3
    if (!record.s3) {
      console.log("not an s3 invocation!");
      continue;
    }

    // check for supported filetype (.mp3)
    if (!record.s3.object.key.endsWith(".mp3")) {
      console.log("can only process mp3 files");
      continue;
    }

    // get the file
    const s3Object = await s3
      .getObject({
        Bucket: record.s3.bucket.name,
        Key: record.s3.object.key
      })
      .promise();

    // write file to disk
    writeFileSync(`/tmp/${record.s3.object.key}`, s3Object.Body);

    // image for video background im ./static/
    let image = "static/image.jpg"

    // output file
    let outFileKey = `${record.s3.object.key.split('.')[0]}.mp4`

    // convert to mp4 using commandline
    try {
      spawnSync(
        "/opt/ffmpeg/ffmpeg",
        [
          "-loop","1",
          "-framerate","1",
          "-i",image,
          "-i",`/tmp/${record.s3.object.key}`,
          "-c:v","libx264",
          "-preset","veryslow",
          "-crf","0",
          "-c:a","copy",
          "-shortest",
          "-y",
          `/tmp/${outFileKey}`
        ],
        { stdio: "inherit" }
      );
    }

    // stop on error
    catch(e) {
      console.log('Error while executing ffmpeg');
      console.log(e);
      continue;
    }

    // read result from disk
    const mp4File = readFileSync(`/tmp/${outFileKey}`);

    // delete the temp files
    unlinkSync(`/tmp/${outFileKey}`);
    unlinkSync(`/tmp/${record.s3.object.key}`);

    // upload result to s3
    await s3
      .putObject({
        Bucket: process.env.BUCKET_DST,
        Key: outFileKey,
        Body: mp4File
      })
      .promise();
  }
};
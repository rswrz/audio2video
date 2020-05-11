const { spawnSync } = require("child_process");
const { readFileSync } = require("fs");
const { unlink, writeFile } = require("fs").promises;
const path = require('path');
const { S3 } = require("aws-sdk");
const s3 = new S3();

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
      console.error("can only process mp3 files");
      continue;
    }

    const bucket = record.s3.bucket.name
    const audiokey = record.s3.object.key
    const filename = path.parse(audiokey).name

    const imagekey = `images/${filename}.jpg`
    const videokey = `results/${filename}.mp4`

    const tmp = '/tmp'
    const audiopath = `${tmp}/${path.parse(audiokey).base}`
    const imagepath = `${tmp}/${path.parse(imagekey).base}`
    const videopath = `${tmp}/${path.parse(videokey).base}`

    let audio, image

    // get files from s3
    try {
      [audio, image] = await Promise.all([
        s3.getObject({ Bucket: bucket, Key: audiokey }).promise(),
        s3.getObject({ Bucket: bucket, Key: imagekey }).promise()
      ])
    }
    catch (err) {
      console.error("Error while getting file from S3 bucket")
      console.error(err)
      continue
    }

    // write files to disk
    try {
      await Promise.all([
        writeFile(audiopath, audio.Body),
        writeFile(imagepath, image.Body)
      ])
    }
    catch (err) {
      console.error("Error while writing file to disk")
      console.error(err)
      continue
    }

    // convert to mp4 using commandline
    try {
      let args = `-nostats -loglevel warning -loop 1 -framerate 1 \
        -i ${imagepath} -i ${audiopath} -c:v libx264 -preset veryslow \
        -crf 0 -c:a copy -shortest -y ${videopath}`
      .trim()
      .replace(/ {1,}/g," ")
      .split(" ")

      console.debug("ffmpeg args", args.join(" "))

      spawnSync(
        "/opt/ffmpeg/ffmpeg",
        args,
        { stdio: "inherit" }
      );
    }
    catch(err) {
      console.error('Error while executing ffmpeg');
      console.error(err);
      continue;
    }

    // read result from disk
    const video = readFileSync(videopath);

    // delete the temp files
    unlink(audiopath);
    unlink(imagepath);
    unlink(videopath);

    // upload result to s3
    await s3
      .putObject({
        Bucket: bucket,
        Key: videokey,
        Body: video
      })
      .promise();
  }
};
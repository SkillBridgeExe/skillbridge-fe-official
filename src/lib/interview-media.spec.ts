import { describe, expect, it, vi } from "vitest";
import { acquireInterviewMedia, stopInterviewMedia } from "./interview-media";

interface FakeStream extends MediaStream {
  addTrack: ReturnType<typeof vi.fn>;
}

function streamWithTracks({
  audio = [],
  video = [],
}: {
  audio?: MediaStreamTrack[];
  video?: MediaStreamTrack[];
}): FakeStream {
  return {
    addTrack: vi.fn(),
    getAudioTracks: () => audio,
    getVideoTracks: () => video,
  } as unknown as FakeStream;
}

function mediaDevices(getUserMedia: ReturnType<typeof vi.fn>): Pick<MediaDevices, "getUserMedia"> {
  return { getUserMedia } as unknown as Pick<MediaDevices, "getUserMedia">;
}

describe("acquireInterviewMedia", () => {
  it("acquires the required microphone before the optional camera", async () => {
    const audioTrack = { kind: "audio" } as MediaStreamTrack;
    const videoTrack = { kind: "video" } as MediaStreamTrack;
    const audioStream = streamWithTracks({ audio: [audioTrack] });
    const videoStream = streamWithTracks({ video: [videoTrack] });
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce(audioStream)
      .mockResolvedValueOnce(videoStream);

    const result = await acquireInterviewMedia(mediaDevices(getUserMedia));

    expect(getUserMedia).toHaveBeenNthCalledWith(1, {
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    expect(getUserMedia).toHaveBeenNthCalledWith(2, { video: true, audio: false });
    expect(audioStream.addTrack).toHaveBeenCalledWith(videoTrack);
    expect(result).toEqual({
      stream: audioStream,
      microphoneError: null,
      cameraError: null,
    });
  });

  it("keeps the microphone stream when camera permission is denied", async () => {
    const audioStream = streamWithTracks({
      audio: [{ kind: "audio" } as MediaStreamTrack],
    });
    const cameraError = new DOMException("Camera denied", "NotAllowedError");
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce(audioStream)
      .mockRejectedValueOnce(cameraError);

    const result = await acquireInterviewMedia(mediaDevices(getUserMedia));

    expect(result).toEqual({
      stream: audioStream,
      microphoneError: null,
      cameraError,
    });
    expect(audioStream.getAudioTracks()).toHaveLength(1);
  });

  it("returns a microphone error without requesting the camera when audio acquisition fails", async () => {
    const microphoneError = new DOMException("Microphone denied", "NotAllowedError");
    const getUserMedia = vi.fn().mockRejectedValueOnce(microphoneError);

    const result = await acquireInterviewMedia(mediaDevices(getUserMedia));

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      stream: null,
      microphoneError,
      cameraError: null,
    });
  });

  it("stops every media track and detaches the video element", () => {
    const audioTrack = { stop: vi.fn() } as unknown as MediaStreamTrack;
    const videoTrack = { stop: vi.fn() } as unknown as MediaStreamTrack;
    const stream = {
      getTracks: () => [audioTrack, videoTrack],
    } as unknown as MediaStream;
    const videoElement = { srcObject: stream } as Pick<HTMLVideoElement, "srcObject">;

    stopInterviewMedia(stream, videoElement);

    expect(audioTrack.stop).toHaveBeenCalledOnce();
    expect(videoTrack.stop).toHaveBeenCalledOnce();
    expect(videoElement.srcObject).toBeNull();
  });
});

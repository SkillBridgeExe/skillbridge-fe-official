export interface InterviewMediaAcquisition {
  stream: MediaStream | null;
  microphoneError: unknown | null;
  cameraError: unknown | null;
}

const INTERVIEW_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export async function acquireInterviewMedia(
  mediaDevices: Pick<MediaDevices, "getUserMedia">,
): Promise<InterviewMediaAcquisition> {
  let audioStream: MediaStream;

  try {
    audioStream = await mediaDevices.getUserMedia({
      video: false,
      audio: INTERVIEW_AUDIO_CONSTRAINTS,
    });
  } catch (microphoneError) {
    return {
      stream: null,
      microphoneError,
      cameraError: null,
    };
  }

  try {
    const cameraStream = await mediaDevices.getUserMedia({ video: true, audio: false });
    for (const track of cameraStream.getVideoTracks()) {
      audioStream.addTrack(track);
    }

    return {
      stream: audioStream,
      microphoneError: null,
      cameraError: null,
    };
  } catch (cameraError) {
    return {
      stream: audioStream,
      microphoneError: null,
      cameraError,
    };
  }
}

export function stopInterviewMedia(
  stream: MediaStream | null,
  videoElement: Pick<HTMLVideoElement, "srcObject"> | null,
): void {
  if (stream) {
    for (const track of stream.getTracks()) track.stop();
  }
  if (videoElement) videoElement.srcObject = null;
}

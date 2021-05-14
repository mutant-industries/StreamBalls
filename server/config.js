export const config = {

  mediasoup: {
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp'
        // 'rtx',
        // 'bwe',
        // 'score',
        // 'simulcast',
        // 'svc'
      ]
    },
    router: {
      mediaCodecs:
                [
                  {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2,
                    parameters:
                            {

                            }
                  },
                  {
                    kind: 'video',
                    mimeType: 'video/H264',
                    clockRate: 90000,
                    parameters:
                            {
                              // 'level-asymmetry-allowed' : 1,
                              'packetization-mode': 1,
                              'profile-level-id': '42e01f'
                            },
                    rtcpFeedback: [] // Will be ignored.
                  }
                ]
    },
    plainTransport: {
      listenIp: '127.0.0.1'
    }
  }
};

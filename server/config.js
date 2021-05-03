module.exports = {
  listenIp: '0.0.0.0',
  // listenPort: 3000,
  mediasoup: {
    // Worker settings
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
    // Router settings
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
    // WebRtcTransport settings
    webRtcTransport: {
      listenIps: [
        {
          ip: '192.168.87.30',
          announcedIp: null
        }
      ],
      initialAvailableOutgoingBitrate: 1000000
    }
  }
};

window.config = function(props) {
  var servicesManager = props.servicesManager;

  return {
    routerBasename: '/',
    enableGoogleCloudAdapter: true,
    enableGoogleCloudAdapterUI: false,
    showStudyList: true,
    filterQueryParam: true,
    httpErrorHandler: error => {
      // This is 429 when rejected from the public idc sandbox too often.
      console.warn(error.status);

      // Could use services manager here to bring up a dialog/modal if needed.
      // console.warn('test, navigate to https://ohif.org/');
      window.location =  'https://storage.googleapis.com/idc-sandbox-002-static/quota_exceeded.html';
    },
    //healthcareApiEndpoint: 'https://console.cloud.google.com/healthcare/browser/locations/us/datasets/pre-mvp-temp/datastores?project=idc-dev-etl',
     healthcareApiEndpoint: 'https://idc-sandbox-002.appspot.com/v1beta1',

    hotkeys: [
      // ~ Global
      {
        commandName: 'incrementActiveViewport',
        label: 'Next Viewport',
        keys: ['right'],
      },
      {
        commandName: 'decrementActiveViewport',
        label: 'Previous Viewport',
        keys: ['left'],
      },
      // Supported Keys: https://craig.is/killing/mice
      // ~ Cornerstone Extension
      { commandName: 'rotateViewportCW', label: 'Rotate Right', keys: ['r'] },
      { commandName: 'rotateViewportCCW', label: 'Rotate Left', keys: ['l'] },
      { commandName: 'invertViewport', label: 'Invert', keys: ['i'] },
      {
        commandName: 'flipViewportVertical',
        label: 'Flip Horizontally',
        keys: ['h'],
      },
      {
        commandName: 'flipViewportHorizontal',
        label: 'Flip Vertically',
        keys: ['v'],
      },
      { commandName: 'scaleUpViewport', label: 'Zoom In', keys: ['+'] },
      { commandName: 'scaleDownViewport', label: 'Zoom Out', keys: ['-'] },
      { commandName: 'fitViewportToWindow', label: 'Zoom to Fit', keys: ['='] },
      { commandName: 'resetViewport', label: 'Reset', keys: ['space'] },
      // clearAnnotations
      { commandName: 'nextImage', label: 'Next Image', keys: ['down'] },
      { commandName: 'previousImage', label: 'Previous Image', keys: ['up'] },
      // firstImage
      // lastImage
      {
        commandName: 'previousViewportDisplaySet',
        label: 'Previous Series',
        keys: ['pagedown'],
      },
      {
        commandName: 'nextViewportDisplaySet',
        label: 'Next Series',
        keys: ['pageup'],
      },
      // ~ Cornerstone Tools
      { commandName: 'setZoomTool', label: 'Zoom', keys: ['z'] },
      // ~ Window level presets
      {
        commandName: 'windowLevelPreset1',
        label: 'W/L Preset 1',
        keys: ['1'],
      },
      {
        commandName: 'windowLevelPreset2',
        label: 'W/L Preset 2',
        keys: ['2'],
      },
      {
        commandName: 'windowLevelPreset3',
        label: 'W/L Preset 3',
        keys: ['3'],
      },
      {
        commandName: 'windowLevelPreset4',
        label: 'W/L Preset 4',
        keys: ['4'],
      },
      {
        commandName: 'windowLevelPreset5',
        label: 'W/L Preset 5',
        keys: ['5'],
      },
      {
        commandName: 'windowLevelPreset6',
        label: 'W/L Preset 6',
        keys: ['6'],
      },
      {
        commandName: 'windowLevelPreset7',
        label: 'W/L Preset 7',
        keys: ['7'],
      },
      {
        commandName: 'windowLevelPreset8',
        label: 'W/L Preset 8',
        keys: ['8'],
      },
      {
        commandName: 'windowLevelPreset9',
        label: 'W/L Preset 9',
        keys: ['9'],
      },
    ],
    cornerstoneExtensionConfig: {},

     whiteLabeling: {
  /* Optional: Should return a React component to be rendered in the "Logo" section of the application's Top Navigation bar */
    createLogoComponentFn: function(React) {
      return React.createElement('a', {
        target: '_self',
        rel: 'noopener noreferrer',
        className: 'header-brand',
        href: '/',
        style: {
          display: 'block',
          textIndent: '-9999px',
          background: 'url(/static/img/idc-black.svg)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          width: '200px',
        },
      });
    },
  },



  };





};

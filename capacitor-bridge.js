// MsouWout Capacitor Bridge
// Enhances the web app with native capabilities when running inside Capacitor
(function() {
  if (!window.Capacitor) return;

  var Capacitor = window.Capacitor;
  var isNative = Capacitor.isNativePlatform();
  if (!isNative) return;

  console.log('[MsouWout] Running in native mode');

  // Status Bar
  if (Capacitor.Plugins.StatusBar) {
    Capacitor.Plugins.StatusBar.setStyle({ style: 'LIGHT' });
    Capacitor.Plugins.StatusBar.setBackgroundColor({ color: '#00209F' });
  }

  // Splash Screen - auto hide after app loads
  if (Capacitor.Plugins.SplashScreen) {
    window.addEventListener('load', function() {
      setTimeout(function() {
        Capacitor.Plugins.SplashScreen.hide();
      }, 500);
    });
  }

  // Geolocation - override browser geolocation with native
  if (Capacitor.Plugins.Geolocation) {
    window._nativeGeolocation = {
      getCurrentPosition: async function(success, error, options) {
        try {
          var pos = await Capacitor.Plugins.Geolocation.getCurrentPosition({
            enableHighAccuracy: options ? options.enableHighAccuracy : true
          });
          success({
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            },
            timestamp: pos.timestamp
          });
        } catch (e) {
          if (error) error(e);
        }
      },
      watchPosition: function(success, error, options) {
        return Capacitor.Plugins.Geolocation.watchPosition({
          enableHighAccuracy: options ? options.enableHighAccuracy : true
        }, function(pos, err) {
          if (err) { if (error) error(err); return; }
          success({
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            },
            timestamp: pos.timestamp
          });
        });
      }
    };
  }

  // Handle hardware back button on Android
  if (Capacitor.Plugins.App) {
    Capacitor.Plugins.App.addListener('backButton', function(data) {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        Capacitor.Plugins.App.minimizeApp();
      }
    });
  }

  // Haptic feedback helper
  window.msouwoutHaptic = function(type) {
    if (!Capacitor.Plugins.Haptics) return;
    if (type === 'light') {
      Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
    } else if (type === 'medium') {
      Capacitor.Plugins.Haptics.impact({ style: 'MEDIUM' });
    } else if (type === 'heavy') {
      Capacitor.Plugins.Haptics.impact({ style: 'HEAVY' });
    } else {
      Capacitor.Plugins.Haptics.notification({ type: 'SUCCESS' });
    }
  };

  // Add safe area CSS variables for iOS notch
  document.documentElement.style.setProperty('--safe-area-top', 'env(safe-area-inset-top, 0px)');
  document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 0px)');

  // ═══════════════════════════════════════════
  // NATIVE TAB BAR - app-only bottom navigation
  // ═══════════════════════════════════════════
  function injectNativeTabBar() {
    var currentPath = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'index';

    var tabs = [
      { id: 'home', label: 'Lakay', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"/></svg>', href: 'index.html', match: ['index',''] },
      { id: 'logistics', label: 'Lojistik', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>', href: 'logistics.html', match: ['logistics'] },
      { id: 'safety', label: 'Sekirite', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>', href: 'security.html', match: ['security','emergency-dash'] },
      { id: 'support', label: 'Sipote', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>', href: 'support.html', match: ['support','chat'] }
    ];

    var tabBar = document.createElement('nav');
    tabBar.id = 'mw-native-tabbar';
    tabBar.setAttribute('role', 'tablist');

    var style = document.createElement('style');
    style.textContent = '#mw-native-tabbar{' +
      'position:fixed;bottom:0;left:0;right:0;z-index:9999;' +
      'display:flex;align-items:center;justify-content:space-around;' +
      'height:calc(56px + env(safe-area-inset-bottom, 0px));' +
      'padding-bottom:env(safe-area-inset-bottom, 0px);' +
      'background:rgba(255,255,255,0.95);' +
      '-webkit-backdrop-filter:saturate(180%) blur(20px);' +
      'backdrop-filter:saturate(180%) blur(20px);' +
      'border-top:0.5px solid rgba(0,0,0,0.12);' +
      'box-shadow:0 -1px 12px rgba(0,0,0,0.06);' +
      '}' +
      '#mw-native-tabbar .mw-tab{' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'flex:1;height:56px;text-decoration:none;' +
      'color:#8A95AA;transition:color 0.2s;' +
      '-webkit-tap-highlight-color:transparent;' +
      '}' +
      '#mw-native-tabbar .mw-tab svg{width:24px;height:24px;margin-bottom:2px}' +
      '#mw-native-tabbar .mw-tab span{font-size:10px;font-weight:600;letter-spacing:0.02em}' +
      '#mw-native-tabbar .mw-tab.active{color:#00209F}' +
      '#mw-native-tabbar .mw-tab.active svg{stroke-width:2.5}' +
      '#mw-native-tabbar .mw-tab:active{transform:scale(0.92);transition:transform 0.1s}' +
      'body.capacitor-native{padding-bottom:calc(56px + env(safe-area-inset-bottom, 20px)) !important}' +
      'body.capacitor-native .bottom-nav,body.capacitor-native .install-overlay,body.capacitor-native .install-prompt{display:none !important}';
    document.head.appendChild(style);

    tabs.forEach(function(tab) {
      var a = document.createElement('a');
      a.className = 'mw-tab';
      a.setAttribute('role', 'tab');
      a.href = tab.href;
      if (tab.match.indexOf(currentPath) !== -1) {
        a.classList.add('active');
        a.setAttribute('aria-selected', 'true');
      }
      a.innerHTML = tab.icon + '<span>' + tab.label + '</span>';
      a.addEventListener('click', function(e) {
        if (window.msouwoutHaptic) window.msouwoutHaptic('light');
      });
      tabBar.appendChild(a);
    });

    document.body.appendChild(tabBar);
  }

  // ═══════════════════════════════════════════
  // PULL-TO-REFRESH
  // ═══════════════════════════════════════════
  function initPullToRefresh() {
    var startY = 0;
    var pulling = false;
    var indicator = document.createElement('div');
    indicator.id = 'mw-pull-refresh';
    var indStyle = document.createElement('style');
    indStyle.textContent = '#mw-pull-refresh{' +
      'position:fixed;top:-50px;left:50%;transform:translateX(-50%);z-index:10000;' +
      'width:36px;height:36px;border-radius:50%;' +
      'background:#fff;box-shadow:0 2px 12px rgba(0,0,0,0.15);' +
      'display:flex;align-items:center;justify-content:center;' +
      'transition:top 0.3s ease;' +
      '}' +
      '#mw-pull-refresh.visible{top:calc(env(safe-area-inset-top, 20px) + 10px)}' +
      '#mw-pull-refresh .spinner{' +
      'width:20px;height:20px;border:2.5px solid #E2E8F0;' +
      'border-top-color:#00209F;border-radius:50%;' +
      'animation:mw-spin 0.6s linear infinite;' +
      '}' +
      '@keyframes mw-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(indStyle);
    indicator.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(indicator);

    document.addEventListener('touchstart', function(e) {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (!pulling) return;
      var diff = e.touches[0].clientY - startY;
      if (diff > 60) {
        indicator.classList.add('visible');
      }
    }, { passive: true });

    document.addEventListener('touchend', function() {
      if (indicator.classList.contains('visible')) {
        if (window.msouwoutHaptic) window.msouwoutHaptic('medium');
        setTimeout(function() {
          window.location.reload();
        }, 400);
      }
      pulling = false;
      indicator.classList.remove('visible');
    });
  }

  // ═══════════════════════════════════════════
  // NATIVE SHARE (replaces web share)
  // ═══════════════════════════════════════════
  function initNativeShare() {
    if (!Capacitor.Plugins.Share) return;
    window.msouwoutShare = async function(title, text, url) {
      try {
        await Capacitor.Plugins.Share.share({
          title: title || 'MsouWout',
          text: text || 'Jwenn yon kous toupatou nan Ayiti!',
          url: url || 'https://msouwout.com',
          dialogTitle: 'Pataje MsouWout'
        });
      } catch (e) {
        console.log('[MsouWout] Share cancelled or failed:', e);
      }
    };

    var shareFab = document.getElementById('shareFab');
    if (shareFab) {
      var shareMenu = document.getElementById('shareMenu');
      if (shareMenu) shareMenu.remove();
      shareFab.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.msouwoutHaptic) window.msouwoutHaptic('light');
        window.msouwoutShare();
      };
    }
  }

  // ═══════════════════════════════════════════
  // NETWORK STATUS BANNER
  // ═══════════════════════════════════════════
  function initNetworkStatus() {
    if (!Capacitor.Plugins.Network) return;
    var banner = document.createElement('div');
    banner.id = 'mw-offline-banner';
    var bStyle = document.createElement('style');
    bStyle.textContent = '';
    bStyle.textContent = '#mw-offline-banner{' +
      'position:fixed;top:0;left:0;right:0;z-index:10001;' +
      'padding:calc(env(safe-area-inset-top, 20px) + 4px) 16px 8px;' +
      'background:#D21034;color:#fff;font-size:13px;font-weight:600;' +
      'text-align:center;transform:translateY(-100%);transition:transform 0.3s ease;' +
      '}' +
      '#mw-offline-banner.show{transform:translateY(0)}';
    document.head.appendChild(bStyle);
    banner.textContent = 'Pa gen entenet — w ap travay offline';
    banner.textContent = '';
    banner.innerHTML = 'Pa gen entènet — w ap travay offline';
    document.body.appendChild(banner);

    Capacitor.Plugins.Network.addListener('networkStatusChange', function(status) {
      if (!status.connected) {
        banner.classList.add('show');
        if (window.msouwoutHaptic) window.msouwoutHaptic('heavy');
      } else {
        banner.classList.remove('show');
      }
    });
  }

  // ═══════════════════════════════════════════
  // LINK & FORM GUARD
  // Keep all sign-in / registration inside the app.
  // External web links open in an in-app browser (SFSafariViewController
  // on iOS) instead of ejecting the user to the default browser — this is
  // required by App Store Review Guideline 4.0 (Design).
  // ═══════════════════════════════════════════
  function isExternalHttp(url) {
    try {
      var u = new URL(url, window.location.href);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
      // Same origin as the bundled app => internal, allow normal navigation
      return u.host !== window.location.host;
    } catch (e) { return false; }
  }

  // Messaging / phone / map deep-links that should open their native app
  function isSystemHandoff(url) {
    return /^(tel:|mailto:|sms:)/i.test(url) ||
           /(^|\.)wa\.me$/i.test(hostOf(url)) ||
           /(^|\.)whatsapp\.com$/i.test(hostOf(url)) ||
           /(^|\.)maps\.google\.com$/i.test(hostOf(url));
  }
  function hostOf(url) {
    try { return new URL(url, window.location.href).host; } catch (e) { return ''; }
  }

  function openInApp(url) {
    if (Capacitor.Plugins.Browser) {
      Capacitor.Plugins.Browser.open({ url: url, presentationStyle: 'popover' });
    } else {
      window.open(url, '_blank');
    }
  }
  function openSystem(url) {
    // Opens the associated native app (WhatsApp, Phone, Mail, Maps)
    window.open(url, '_system');
  }

  function initLinkGuard() {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;

      if (/^(tel:|mailto:|sms:)/i.test(href)) return; // let OS handle

      if (isSystemHandoff(href)) {
        e.preventDefault();
        openSystem(href);
        return;
      }
      if (isExternalHttp(href)) {
        e.preventDefault();
        openInApp(href);
      }
      // relative / same-host links: allow normal in-app navigation
    }, true);
  }

  // ═══════════════════════════════════════════
  // PAGE TRANSITIONS
  // ═══════════════════════════════════════════
  function initPageTransitions() {
    var transStyle = document.createElement('style');
    transStyle.textContent = 'body.capacitor-native{animation:mw-fadeIn 0.25s ease-out}' +
      '@keyframes mw-fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(transStyle);
  }

  // Initialize all native enhancements when DOM is ready
  function initAll() {
    injectNativeTabBar();
    initPullToRefresh();
    initNativeShare();
    initNetworkStatus();
    initPageTransitions();
    initLinkGuard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  console.log('[MsouWout] Native bridge initialized');
})();

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';
import { hapticImpact, hapticSelection } from '../lib/haptics';

interface Props {
  visible: boolean;
  uri: string;
  name: string;
  pageCount?: number;
  onClose: () => void;
}

type WebViewComponent = React.ComponentType<{
  source: { uri: string };
  style?: object;
  originWhitelist?: string[];
  allowFileAccess?: boolean;
  allowUniversalAccessFromFileURLs?: boolean;
  mixedContentMode?: string;
  startInLoadingState?: boolean;
  renderLoading?: () => React.ReactElement;
  onError?: () => void;
}>;

let WebViewMod: WebViewComponent | null | false = null;

function getWebView(): WebViewComponent | null {
  if (WebViewMod === false) return null;
  if (WebViewMod) return WebViewMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-webview');
    WebViewMod = (mod.WebView ?? mod.default) as WebViewComponent;
    return WebViewMod;
  } catch {
    WebViewMod = false;
    return null;
  }
}

/** In-app PDF reader — WebView when available, external open as fallback. */
export function PdfReaderModal({ visible, uri, name, pageCount, onClose }: Props) {
  const WebView = useMemo(() => getWebView(), []);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setFailed(false);
    setZoom(1);
  }, [uri, visible]);

  const openExternal = async () => {
    void hapticSelection();
    try {
      const supported = await Linking.canOpenURL(uri);
      if (supported) await Linking.openURL(uri);
    } catch {
      // ignore
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.shell}>
        <View style={[styles.topBar, shadows.control]}>
          <Pressable
            onPress={() => {
              void hapticImpact('light');
              onClose();
            }}
            style={styles.iconBtn}
            accessibilityLabel="Close PDF"
          >
            <Ionicons name="close" size={22} color={colors.cream} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.meta}>
              {pageCount ? `~${pageCount} pages · ` : ''}
              In-app reader
            </Text>
          </View>
          <Pressable onPress={openExternal} style={styles.iconBtn} accessibilityLabel="Open externally">
            <Ionicons name="open-outline" size={20} color={colors.cream} />
          </Pressable>
        </View>

        <View style={styles.stage}>
          {WebView && !failed ? (
            <WebView
              source={{ uri }}
              style={[styles.webview, { transform: [{ scale: zoom }] }]}
              originWhitelist={['*']}
              allowFileAccess
              allowUniversalAccessFromFileURLs
              mixedContentMode="always"
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loading}>
                  <ActivityIndicator color={colors.clayDeep} />
                  <Text style={styles.loadingText}>Opening PDF…</Text>
                </View>
              )}
              onError={() => setFailed(true)}
            />
          ) : (
            <View style={styles.fallback}>
              <Ionicons name="document-text-outline" size={48} color={colors.clayDeep} />
              <Text style={styles.fallbackTitle}>{name}</Text>
              <Text style={styles.fallbackBody}>
                Native PDF preview is unavailable here. Open the file in another app, or reinstall
                Fieldnote after a build that includes WebView.
              </Text>
              <Pressable style={styles.primary} onPress={openExternal}>
                <Text style={styles.primaryText}>Open externally</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={[styles.bottomBar, shadows.control]}>
          <Pressable
            style={styles.chip}
            onPress={() => {
              void hapticSelection();
              setZoom((z) => Math.max(0.6, z / 1.15));
            }}
            accessibilityLabel="Zoom out"
          >
            <Ionicons name="remove" size={18} color={colors.cream} />
          </Pressable>
          <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
          <Pressable
            style={styles.chip}
            onPress={() => {
              void hapticSelection();
              setZoom((z) => Math.min(2.5, z * 1.15));
            }}
            accessibilityLabel="Zoom in"
          >
            <Ionicons name="add" size={18} color={colors.cream} />
          </Pressable>
          <Pressable style={styles.chipWide} onPress={openExternal}>
            <Text style={styles.chipText}>Share / Open</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.walnut,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 15,
  },
  meta: {
    color: 'rgba(255,248,233,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  stage: {
    flex: 1,
    backgroundColor: '#ebe3d4',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: colors.paperStrong,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.canvas,
  },
  loadingText: {
    color: colors.mutedInk,
    fontWeight: '600',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  fallbackTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },
  fallbackBody: {
    color: colors.mutedInk,
    textAlign: 'center',
    lineHeight: 20,
  },
  primary: {
    marginTop: 8,
    backgroundColor: colors.clayDeep,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radii.control,
  },
  primaryText: {
    color: colors.cream,
    fontWeight: '700',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 22,
    backgroundColor: colors.walnut,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  chipWide: {
    marginLeft: 'auto',
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.clayDeep,
  },
  chipText: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 13,
  },
  zoomLabel: {
    color: colors.cream,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'center',
  },
});

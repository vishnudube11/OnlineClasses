import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { createOrder, verifyPayment } from "@/src/api/razorpay";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

const WebView =
  Platform.OS === "web"
    ? require("react-native-web-webview").WebView
    : require("react-native-webview").WebView;

const COURSE_PRICES_INR: Record<string, number> = {
  java: 499,
  python: 499,
  "react native": 599,
  "web development": 599,
  "ui/ux design": 699,
};

const getAmountPaise = (category: string) => {
  const key = (category || "").toLowerCase();
  const amountInr = COURSE_PRICES_INR[key] ?? 499;
  return amountInr * 100;
};

export default function PayScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();

  const categoryStr = useMemo(() => {
    if (Array.isArray(category)) return category[0] || "";
    return category || "";
  }, [category]);

  const paymentsEnabled =
    (process.env.EXPO_PUBLIC_ENABLE_PAYMENTS ?? "true").toLowerCase() ===
    "true";

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [loading, setLoading] = useState(true);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const webviewRef = useRef<any>(null);

  const amount = useMemo(() => getAmountPaise(categoryStr), [categoryStr]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!paymentsEnabled) {
          router.replace({
            pathname: "/course/[category]",
            params: { category: categoryStr },
          } as any);
          return;
        }

        if (!categoryStr) {
          setError("Missing course category");
          setLoading(false);
          return;
        }

        const receipt = `course_${categoryStr}_${Date.now()}`;
        const order = await createOrder({
          amount,
          currency: "INR",
          receipt,
          notes: { category: categoryStr },
        });

        const prefillName = "";
        const prefillEmail = "";

        const html = `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  </head>
  <body>
    <script>
      (function() {
        function post(msg) {
          var payload;
          try {
            payload = 'RAZP:' + JSON.stringify(msg);
          } catch (e) {
            payload = 'RAZP:' + JSON.stringify({ type: 'error', message: 'serialize failed' });
          }

          try {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(payload);
              return;
            }
          } catch (e) {}

          try {
            if (window.parent && window.parent.postMessage) {
              window.parent.postMessage(payload, '*');
              return;
            }
          } catch (e) {}

          try {
            if (window.postMessage) {
              window.postMessage(payload, '*');
            }
          } catch (e) {}
        }

        var options = {
          key: ${JSON.stringify(order.keyId)},
          amount: ${JSON.stringify(order.amount)},
          currency: ${JSON.stringify(order.currency)},
          name: ${JSON.stringify("VideoMaster")},
          description: ${JSON.stringify(categoryStr + " Course")},
          order_id: ${JSON.stringify(order.orderId)},
          prefill: {
            name: ${JSON.stringify(prefillName)},
            email: ${JSON.stringify(prefillEmail)}
          },
          theme: { color: '#ff0000' },
          handler: function (response){
            post({ type: 'success', response: response });
          },
          modal: {
            ondismiss: function() {
              post({ type: 'dismiss' });
            }
          }
        };
        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function (resp){
          var safe = {
            code: (resp && resp.error && resp.error.code) ? resp.error.code : 'PAYMENT_FAILED',
            description: (resp && resp.error && resp.error.description) ? resp.error.description : 'Payment failed',
            reason: (resp && resp.error && resp.error.reason) ? resp.error.reason : undefined,
            source: (resp && resp.error && resp.error.source) ? resp.error.source : undefined,
            step: (resp && resp.error && resp.error.step) ? resp.error.step : undefined,
          };
          post({ type: 'failed', error: safe });
        });
        rzp.open();
      })();
    </script>
  </body>
</html>`;

        if (cancelled) return;
        setCheckoutHtml(html);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to start payment");
        setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [amount, categoryStr, paymentsEnabled, router]);

  const onMessage = async (event: any) => {
    try {
      const raw = event?.nativeEvent?.data;

      if (typeof raw !== "string") {
        return;
      }

      if (!raw.startsWith("RAZP:")) {
        return;
      }

      const msg = JSON.parse(raw.slice("RAZP:".length));

      if (msg.type === "dismiss") {
        router.back();
        return;
      }

      if (msg.type === "failed") {
        setError(
          msg?.error?.description || "Payment failed. Please try again.",
        );
        return;
      }

      if (msg.type === "error") {
        setError(msg?.message || "Payment error.");
        return;
      }

      if (msg.type === "success") {
        const r = msg.response;

        if (
          !r?.razorpay_order_id ||
          !r?.razorpay_payment_id ||
          !r?.razorpay_signature
        ) {
          setError("Missing payment fields from Razorpay.");
          return;
        }

        let verification: { verified: boolean };
        try {
          verification = await verifyPayment({
            razorpay_order_id: r.razorpay_order_id,
            razorpay_payment_id: r.razorpay_payment_id,
            razorpay_signature: r.razorpay_signature,
          });
        } catch (_err) {
          setError("Payment verification request failed.");
          return;
        }

        if (verification.verified) {
          router.replace({
            pathname: "/course/[category]",
            params: { category: categoryStr },
          } as any);
          return;
        } else {
          setError("Payment verification failed.");
        }
      }
    } catch (_e: any) {
      setError("Unexpected payment response.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Complete Payment
        </Text>
        <Text style={[styles.subtitle, { color: theme.tabIconDefault }]}>
          Course: {category}
        </Text>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ff0000" />
          <Text style={[styles.help, { color: theme.tabIconDefault }]}>
            Opening Razorpay…
          </Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={[styles.error, { color: "#ff4444" }]}>{error}</Text>
          <Pressable style={styles.btn} onPress={() => router.back()}>
            <Text style={styles.btnText}>Go Back</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && checkoutHtml && (
        <WebView
          ref={webviewRef}
          originWhitelist={["*"]}
          source={{ html: checkoutHtml }}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#ff0000" />
              <Text style={[styles.help, { color: theme.tabIconDefault }]}>
                Loading checkout…
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { marginTop: 6, fontSize: 13 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  help: { fontSize: 13 },
  error: { fontSize: 14, textAlign: "center" },
  btn: {
    marginTop: 8,
    backgroundColor: "#ff0000",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },
});

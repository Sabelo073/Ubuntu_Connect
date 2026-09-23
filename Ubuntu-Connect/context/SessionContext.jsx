import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Alert,
  AppState,
  Platform,
  View,
} from "react-native";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebaseConfig";

const SessionContext = createContext(null);

// 15 minutes without activity
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

// Warn the user one minute before logout
const WARNING_TIME = 14 * 60 * 1000;

// Maximum session duration of 8 hours
const MAXIMUM_SESSION_DURATION =
  8 * 60 * 60 * 1000;

// Limit Firestore activity updates
const ACTIVITY_UPDATE_INTERVAL =
  60 * 1000;

export const useSession = () => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error(
      "useSession must be used inside SessionProvider."
    );
  }

  return context;
};

export function SessionProvider({
  children,
  navigationRef,
}) {
  const [sessionId, setSessionId] =
    useState(null);

  const [sessionStartedAt, setSessionStartedAt] =
    useState(null);

  const [lastActivityAt, setLastActivityAt] =
    useState(Date.now());

  const [warningVisible, setWarningVisible] =
    useState(false);

  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const maximumTimerRef = useRef(null);

  const latestActivityWriteRef =
    useRef(0);

  const endingSessionRef = useRef(false);
  const currentUserIdRef = useRef(null);

  const showMessage = useCallback(
    (title, message) => {
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined"
      ) {
        window.alert(
          `${title}\n\n${message}`
        );
      } else {
        Alert.alert(title, message);
      }
    },
    []
  );

  const clearSessionTimers = useCallback(
    () => {
      if (inactivityTimerRef.current) {
        clearTimeout(
          inactivityTimerRef.current
        );
      }

      if (warningTimerRef.current) {
        clearTimeout(
          warningTimerRef.current
        );
      }

      if (maximumTimerRef.current) {
        clearTimeout(
          maximumTimerRef.current
        );
      }

      inactivityTimerRef.current = null;
      warningTimerRef.current = null;
      maximumTimerRef.current = null;
    },
    []
  );

  const writeAuditLog = useCallback(
    async ({
      action,
      description,
      actorRole = "User",
      targetType = "session",
      targetId = "",
      metadata = {},
    }) => {
      const user = auth.currentUser;

      try {
        await addDoc(
          collection(db, "auditLogs"),
          {
            action,

            actorId:
              user?.uid ||
              currentUserIdRef.current ||
              "",

            actorEmail:
              user?.email || "",

            actorRole,

            targetType,
            targetId,
            description,

            platform: Platform.OS,

            metadata,

            timestamp: serverTimestamp(),
          }
        );
      } catch (error) {
        console.log(
          "AUDIT LOG ERROR:",
          error.code,
          error.message
        );
      }
    },
    []
  );

  const updateSessionDocument = useCallback(
    async (updates) => {
      if (!sessionId) {
        return;
      }

      try {
        await updateDoc(
          doc(db, "sessions", sessionId),
          updates
        );
      } catch (error) {
        console.log(
          "SESSION UPDATE ERROR:",
          error.code,
          error.message
        );
      }
    },
    [sessionId]
  );

  const navigateToLogin = useCallback(() => {
    if (
      navigationRef?.current?.isReady?.()
    ) {
      navigationRef.current.reset({
        index: 0,
        routes: [
          {
            name: "Login",
          },
        ],
      });
    }
  }, [navigationRef]);

  const endSession = useCallback(
    async ({
      status = "LoggedOut",
      reason = "User logged out.",
      showNotice = false,
    } = {}) => {
      if (endingSessionRef.current) {
        return;
      }

      endingSessionRef.current = true;

      clearSessionTimers();

      const currentSessionId = sessionId;
      const user = auth.currentUser;

      try {
        if (currentSessionId) {
          await updateDoc(
            doc(
              db,
              "sessions",
              currentSessionId
            ),
            {
              status,
              logoutAt:
                serverTimestamp(),
              lastActivityAt:
                serverTimestamp(),
              logoutReason: reason,
            }
          );
        }

        await writeAuditLog({
          action:
            status === "Expired"
              ? "SESSION_EXPIRED"
              : "USER_LOGOUT",

          description: reason,

          targetType: "session",
          targetId:
            currentSessionId || "",

          metadata: {
            sessionStatus: status,
          },
        });

        if (user) {
          await signOut(auth);
        }
      } catch (error) {
        console.log(
          "END SESSION ERROR:",
          error.code,
          error.message
        );
      } finally {
        setSessionId(null);
        setSessionStartedAt(null);
        setWarningVisible(false);

        currentUserIdRef.current = null;
        endingSessionRef.current = false;

        navigateToLogin();

        if (showNotice) {
          showMessage(
            "Session Expired",
            reason
          );
        }
      }
    },
    [
      clearSessionTimers,
      navigateToLogin,
      sessionId,
      showMessage,
      writeAuditLog,
    ]
  );

  const startTimers = useCallback(() => {
    clearSessionTimers();

    if (!auth.currentUser) {
      return;
    }

    warningTimerRef.current =
      setTimeout(() => {
        setWarningVisible(true);

        showMessage(
          "Session Expiring",
          "Your session will expire in one minute because no activity was detected."
        );
      }, WARNING_TIME);

    inactivityTimerRef.current =
      setTimeout(() => {
        endSession({
          status: "Expired",

          reason:
            "Your Ubuntu Connect session expired after 15 minutes of inactivity.",

          showNotice: true,
        });
      }, INACTIVITY_TIMEOUT);
  }, [
    clearSessionTimers,
    endSession,
    showMessage,
  ]);

  const recordActivity = useCallback(
    async () => {
      if (
        !auth.currentUser ||
        endingSessionRef.current
      ) {
        return;
      }

      const now = Date.now();

      setLastActivityAt(now);
      setWarningVisible(false);

      startTimers();

      if (
        now -
          latestActivityWriteRef.current <
        ACTIVITY_UPDATE_INTERVAL
      ) {
        return;
      }

      latestActivityWriteRef.current = now;

      await updateSessionDocument({
        lastActivityAt:
          serverTimestamp(),
      });
    },
    [
      startTimers,
      updateSessionDocument,
    ]
  );

  const startSession = useCallback(
    async (user) => {
      if (
        !user ||
        endingSessionRef.current
      ) {
        return;
      }

      if (
        currentUserIdRef.current ===
          user.uid &&
        sessionId
      ) {
        startTimers();
        return;
      }

      try {
        currentUserIdRef.current =
          user.uid;

        let userRole = "User";

        const userSnapshot = await getDoc(
          doc(db, "users", user.uid)
        );

        if (userSnapshot.exists()) {
          userRole =
            userSnapshot.data().role ||
            "User";
        }

        const now = Date.now();

        const sessionReference =
          await addDoc(
            collection(db, "sessions"),
            {
              userId: user.uid,
              userEmail:
                user.email || "",
              userRole,

              loginAt: serverTimestamp(),
              lastActivityAt:
                serverTimestamp(),

              expiresAt: new Date(
                now +
                  MAXIMUM_SESSION_DURATION
              ),

              logoutAt: null,
              logoutReason: "",

              status: "Active",
              platform: Platform.OS,
            }
          );

        setSessionId(
          sessionReference.id
        );

        setSessionStartedAt(now);
        setLastActivityAt(now);

        await writeAuditLog({
          action: "USER_LOGIN",

          description:
            "User session started.",

          actorRole: userRole,

          targetType: "session",
          targetId:
            sessionReference.id,

          metadata: {
            platform: Platform.OS,
          },
        });

        clearSessionTimers();

        maximumTimerRef.current =
          setTimeout(() => {
            endSession({
              status: "Expired",

              reason:
                "Your Ubuntu Connect session reached its maximum duration of 8 hours.",

              showNotice: true,
            });
          }, MAXIMUM_SESSION_DURATION);

        warningTimerRef.current =
          setTimeout(() => {
            setWarningVisible(true);

            showMessage(
              "Session Expiring",
              "Your session will expire in one minute because no activity was detected."
            );
          }, WARNING_TIME);

        inactivityTimerRef.current =
          setTimeout(() => {
            endSession({
              status: "Expired",

              reason:
                "Your Ubuntu Connect session expired after 15 minutes of inactivity.",

              showNotice: true,
            });
          }, INACTIVITY_TIMEOUT);
      } catch (error) {
        console.log(
          "START SESSION ERROR:",
          error.code,
          error.message
        );
      }
    },
    [
      clearSessionTimers,
      endSession,
      sessionId,
      showMessage,
      writeAuditLog,
    ]
  );

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            startSession(user);
          } else {
            clearSessionTimers();
            setSessionId(null);
            setSessionStartedAt(null);
            setWarningVisible(false);
            currentUserIdRef.current =
              null;
          }
        }
      );

    return unsubscribe;
  }, [
    clearSessionTimers,
    startSession,
  ]);

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        "change",
        (nextState) => {
          if (
            nextState === "active" &&
            auth.currentUser
          ) {
            recordActivity();
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, [recordActivity]);

  useEffect(() => {
    return () => {
      clearSessionTimers();
    };
  }, [clearSessionTimers]);

const value = {
  sessionId,
  sessionStartedAt,
  lastActivityAt,
  warningVisible,
  recordActivity,
  startSession,
  endSession,
  writeAuditLog,
};


  return (
    <SessionContext.Provider
      value={value}
    >
      <View
        style={{ flex: 1 }}
        onTouchStart={recordActivity}
        onPointerDown={recordActivity}
      >
        {children}
      </View>
    </SessionContext.Provider>
  );
}
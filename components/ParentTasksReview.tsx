import React, { useEffect, useMemo, useState } from "react";
import { parentApi } from "../services/api";

type ApiTask = {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  icon: string;
  status: "IDLE" | "WAITING" | "CONFIRMED";
  child_name?: string;
};

type Props = {
  parentCode: string;
};

const ParentTasksReview: React.FC<Props> = ({ parentCode }) => {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const waiting = useMemo(
    () => tasks.filter((t) => t.status === "WAITING"),
    [tasks]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await parentApi.getTasks(parentCode);
      setTasks((res?.tasks ?? []) as ApiTask[]);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentCode]);

  async function act(taskId: string, action: "confirm" | "reject") {
    try {
      await parentApi.confirmTask(parentCode, taskId, action);
      await load();
    } catch (e) {
      console.error(e);
      alert(String(e));
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800 }}>Родитель - проверка задач</h2>

      <div style={{ marginTop: 8, opacity: 0.8 }}>
        code: <b>{parentCode}</b>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={load} disabled={loading}>
          {loading ? "Загрузка..." : "Обновить"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, color: "crimson", whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700 }}>
          На проверке: {waiting.length}
        </h3>

        {waiting.length === 0 ? (
          <div style={{ marginTop: 8, opacity: 0.7 }}>Нет задач на проверку</div>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
            {waiting.map((t) => (
              <div
                key={t.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 20 }}>{t.icon || "✅"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>
                      {t.title}{" "}
                      {t.child_name ? (
                        <span style={{ opacity: 0.7, fontWeight: 600 }}>
                          - {t.child_name}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ opacity: 0.8 }}>
                      +{t.reward_amount}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => act(t.id, "confirm")}>
                      Подтвердить
                    </button>
                    <button onClick={() => act(t.id, "reject")}>
                      Отклонить
                    </button>
                  </div>
                </div>

                {t.description ? (
                  <div style={{ marginTop: 8, opacity: 0.75 }}>
                    {t.description}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentTasksReview;
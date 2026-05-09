"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Settings, Loader2, MapPin } from "lucide-react";
import { fetchUserSettings, getBrowserTimezone, updateUserSettings } from "../lib/app-client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function UserSettingsModal({
  userId,
  open,
  onOpenChange,
}: {
  userId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dailyNew, setDailyNew] = useState(20);
  const [dailyReview, setDailyReview] = useState(50);
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchUserSettings()
        .then((s) => {
          setDailyNew(s.daily_new_limit);
          setDailyReview(s.daily_review_limit);
          setTimezone(s.timezone);
        })
        .catch(() => setMsg("Không tải được cài đặt"))
        .finally(() => setLoading(false));
    } else {
      setMsg("");
    }
  }, [open, userId]);

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      await updateUserSettings(dailyNew, dailyReview, timezone);
      onOpenChange(false);
    } catch {
      setMsg("Lỗi khi lưu cài đặt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[201] grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-xl sm:rounded-[24px] outline-none">
          <div className="flex justify-between items-center mb-1">
            <Dialog.Title className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Cài đặt học
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-surface-muted transition-colors outline-none cursor-pointer">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-muted-foreground text-[0.95rem]">
            Điều chỉnh giới hạn thẻ mới, thẻ ôn tập và múi giờ học mỗi ngày.
          </Dialog.Description>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <label className="text-[0.9rem] font-semibold">Giới hạn thẻ mới / ngày</label>
                <Input
                  type="number"
                  min="0"
                  value={dailyNew}
                  onChange={(e) => setDailyNew(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.9rem] font-semibold">Giới hạn thẻ ôn / ngày</label>
                <Input
                  type="number"
                  min="0"
                  value={dailyReview}
                  onChange={(e) => setDailyReview(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.9rem] font-semibold">Múi giờ</label>
                <div className="flex gap-2">
                  <Input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="Asia/Ho_Chi_Minh"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setTimezone(getBrowserTimezone())}
                    className="shrink-0"
                    title="Dùng múi giờ thiết bị"
                  >
                    <MapPin className="w-4 h-4" aria-hidden />
                  </Button>
                </div>
              </div>

              {msg && <p className="text-danger text-[0.85rem]">{msg}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Dialog.Close asChild>
                  <Button variant="secondary">Hủy</Button>
                </Dialog.Close>
                <Button onClick={handleSave} disabled={saving} variant="primary">
                  {saving ? "Đang lưu..." : "Lưu"}
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

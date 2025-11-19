import { useState } from "react";
import { Copy, Plus, Trash2, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { toast } from "sonner@2.0.3";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  hasBreak?: boolean;
  breakStart?: string;
  breakEnd?: string;
}

interface DaySchedule {
  day: string;
  isOff: boolean;
  slots: TimeSlot[];
}

interface AvailabilitySectionProps {
  onUnsavedChanges: (hasChanges: boolean) => void;
}

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const initialSchedule: DaySchedule[] = [
  {
    day: "Monday",
    isOff: false,
    slots: [
      { id: "mon-1", start: "09:00", end: "13:00" },
      { id: "mon-2", start: "15:00", end: "19:00" },
    ],
  },
  {
    day: "Tuesday",
    isOff: false,
    slots: [
      { id: "tue-1", start: "09:00", end: "13:00" },
      { id: "tue-2", start: "15:00", end: "19:00" },
    ],
  },
  {
    day: "Wednesday",
    isOff: false,
    slots: [{ id: "wed-1", start: "09:00", end: "13:00" }],
  },
  {
    day: "Thursday",
    isOff: false,
    slots: [
      { id: "thu-1", start: "09:00", end: "13:00" },
      { id: "thu-2", start: "15:00", end: "19:00" },
    ],
  },
  {
    day: "Friday",
    isOff: false,
    slots: [{ id: "fri-1", start: "09:00", end: "17:00" }],
  },
  { day: "Saturday", isOff: true, slots: [] },
  { day: "Sunday", isOff: true, slots: [] },
];

export function AvailabilitySection({ onUnsavedChanges }: AvailabilitySectionProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(initialSchedule);
  const [maxConcurrent, setMaxConcurrent] = useState("3");
  const [copyFromDay, setCopyFromDay] = useState<string>("");

  const handleToggleDay = (dayIndex: number) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].isOff = !newSchedule[dayIndex].isOff;
    setSchedule(newSchedule);
    onUnsavedChanges(true);
  };

  const handleAddSlot = (dayIndex: number) => {
    const newSchedule = [...schedule];
    const newSlot: TimeSlot = {
      id: `${schedule[dayIndex].day.toLowerCase()}-${Date.now()}`,
      start: "09:00",
      end: "17:00",
    };
    newSchedule[dayIndex].slots.push(newSlot);
    setSchedule(newSchedule);
    onUnsavedChanges(true);
  };

  const handleRemoveSlot = (dayIndex: number, slotIndex: number) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].slots.splice(slotIndex, 1);
    setSchedule(newSchedule);
    onUnsavedChanges(true);
  };

  const handleSlotChange = (
    dayIndex: number,
    slotIndex: number,
    field: "start" | "end",
    value: string
  ) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].slots[slotIndex][field] = value;
    setSchedule(newSchedule);
    onUnsavedChanges(true);
  };

  const handleToggleBreak = (dayIndex: number, slotIndex: number) => {
    const newSchedule = [...schedule];
    const slot = newSchedule[dayIndex].slots[slotIndex];
    if (slot.hasBreak) {
      slot.hasBreak = false;
      delete slot.breakStart;
      delete slot.breakEnd;
    } else {
      slot.hasBreak = true;
      slot.breakStart = "12:00";
      slot.breakEnd = "13:00";
    }
    setSchedule(newSchedule);
    onUnsavedChanges(true);
  };

  const handleCopySchedule = () => {
    if (!copyFromDay) return;
    
    const sourceDay = schedule.find((d) => d.day === copyFromDay);
    if (!sourceDay) return;

    const newSchedule = schedule.map((day) => {
      if (day.day === copyFromDay) return day;
      return {
        ...day,
        isOff: sourceDay.isOff,
        slots: sourceDay.slots.map((slot) => ({
          ...slot,
          id: `${day.day.toLowerCase()}-${Date.now()}-${Math.random()}`,
        })),
      };
    });

    setSchedule(newSchedule);
    onUnsavedChanges(true);
    toast.success(`Schedule copied from ${copyFromDay} to all days`);
  };

  const handleSave = () => {
    onUnsavedChanges(false);
    toast.success("Availability updated successfully");
  };

  const getNextAvailableSlots = () => {
    const availableSlots: string[] = [];
    const today = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = dayNames[date.getDay()];
      const daySchedule = schedule.find((d) => d.day === dayName);

      if (daySchedule && !daySchedule.isOff && daySchedule.slots.length > 0) {
        const formattedDate = date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const firstSlot = daySchedule.slots[0];
        availableSlots.push(`${formattedDate}, ${firstSlot.start}`);
        if (availableSlots.length >= 3) break;
      }
    }

    return availableSlots;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3>Weekly Schedule</h3>
          <p className="text-slate-600 mt-1">
            Set your availability for consultations throughout the week
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={copyFromDay} onValueChange={setCopyFromDay}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Copy from..." />
            </SelectTrigger>
            <SelectContent>
              {daysOfWeek.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySchedule}
            disabled={!copyFromDay}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy to All
          </Button>
        </div>
      </div>

      {/* Capacity Setting */}
      <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
        <Clock className="w-5 h-5 text-blue-600" />
        <div className="flex-1">
          <Label htmlFor="capacity">Max Concurrent Patients</Label>
          <p className="text-sm text-slate-600">
            Maximum number of patients you can see at the same time
          </p>
        </div>
        <Input
          id="capacity"
          type="number"
          min="1"
          max="10"
          value={maxConcurrent}
          onChange={(e) => {
            setMaxConcurrent(e.target.value);
            onUnsavedChanges(true);
          }}
          className="w-20"
        />
      </div>

      {/* Schedule Grid */}
      <div className="space-y-4">
        {schedule.map((daySchedule, dayIndex) => (
          <Card key={daySchedule.day} className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h4 className="w-24">{daySchedule.day}</h4>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!daySchedule.isOff}
                      onCheckedChange={() => handleToggleDay(dayIndex)}
                    />
                    <span className="text-sm text-slate-600">
                      {daySchedule.isOff ? "Day Off" : "Available"}
                    </span>
                  </div>
                </div>

                {!daySchedule.isOff && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSlot(dayIndex)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Slot
                  </Button>
                )}
              </div>

              {!daySchedule.isOff && daySchedule.slots.length > 0 && (
                <div className="space-y-3 pl-28">
                  {daySchedule.slots.map((slot, slotIndex) => (
                    <div
                      key={slot.id}
                      className="flex flex-col gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={slot.start}
                            onChange={(e) =>
                              handleSlotChange(
                                dayIndex,
                                slotIndex,
                                "start",
                                e.target.value
                              )
                            }
                            className="w-32"
                          />
                          <span className="text-slate-600">to</span>
                          <Input
                            type="time"
                            value={slot.end}
                            onChange={(e) =>
                              handleSlotChange(
                                dayIndex,
                                slotIndex,
                                "end",
                                e.target.value
                              )
                            }
                            className="w-32"
                          />
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleBreak(dayIndex, slotIndex)}
                        >
                          {slot.hasBreak ? "Remove Break" : "Add Break"}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSlot(dayIndex, slotIndex)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>

                      {slot.hasBreak && (
                        <div className="flex items-center gap-2 pl-4 border-l-2 border-amber-500">
                          <span className="text-sm text-slate-600">Break:</span>
                          <Input
                            type="time"
                            value={slot.breakStart || "12:00"}
                            onChange={(e) => {
                              const newSchedule = [...schedule];
                              newSchedule[dayIndex].slots[slotIndex].breakStart =
                                e.target.value;
                              setSchedule(newSchedule);
                              onUnsavedChanges(true);
                            }}
                            className="w-32"
                          />
                          <span className="text-slate-600">to</span>
                          <Input
                            type="time"
                            value={slot.breakEnd || "13:00"}
                            onChange={(e) => {
                              const newSchedule = [...schedule];
                              newSchedule[dayIndex].slots[slotIndex].breakEnd =
                                e.target.value;
                              setSchedule(newSchedule);
                              onUnsavedChanges(true);
                            }}
                            className="w-32"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!daySchedule.isOff && daySchedule.slots.length === 0 && (
                <p className="text-sm text-slate-500 pl-28">
                  No time slots added. Click "Add Slot" to get started.
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Next Available Preview */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <h4 className="mb-3">Next Available Slots</h4>
        <p className="text-sm text-slate-600 mb-4">
          Based on your current schedule, here are your next available time slots:
        </p>
        <div className="flex flex-wrap gap-2">
          {getNextAvailableSlots().map((slot, index) => (
            <Badge key={index} variant="secondary" className="px-3 py-1">
              {slot}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 border-t border-slate-200">
        <Button onClick={handleSave}>Save Availability</Button>
        <Button variant="outline">Cancel</Button>
      </div>
    </div>
  );
}

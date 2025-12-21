import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, Copy, Loader2 } from "lucide-react";
import { 
  Button, 
  Label, 
  Input, 
  Switch, 
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@smartmed/ui";
import { toast } from "sonner";
import { useDoctorAvailability, useUpdateAvailability, useDeleteAvailabilitySlot } from "@/hooks/useProfile";
import { DoctorAvailability } from "@smartmed/types";

interface AvailabilitySectionProps {
  onUnsavedChanges: (hasChanges: boolean) => void;
}

interface TimeSlot {
  id?: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime: string;
  hasBreak: boolean;
  breakStart?: string;
  breakEnd?: string;
  isAvailable: boolean;
}

interface DaySchedule {
  day: string;
  dayOfWeek: number;
  isOff: boolean;
  slots: TimeSlot[];
}

function rangesOverlap(a: TimeSlot, b: TimeSlot) {
  const startA = a.startTime;
  const endA = a.endTime;
  const startB = b.startTime;
  const endB = b.endTime;
  return startA < endB && startB < endA;
}

function buildScheduleFromAvailability(availability: DoctorAvailability[]): DaySchedule[] {
  return daysOfWeek.map(day => {
    const daySlots = availability
      .filter(slot => slot.dayOfWeek === day.value && slot.isAvailable)
      .map(slot => ({
        id: slot.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        hasBreak: slot.hasBreak,
        breakStart: slot.breakStart,
        breakEnd: slot.breakEnd,
        isAvailable: slot.isAvailable,
      }));

    return {
      day: day.name,
      dayOfWeek: day.value,
      isOff: daySlots.length === 0,
      slots: daySlots,
    };
  });
}

const daysOfWeek = [
  { name: "Sunday", value: 0 },
  { name: "Monday", value: 1 },
  { name: "Tuesday", value: 2 },
  { name: "Wednesday", value: 3 },
  { name: "Thursday", value: 4 },
  { name: "Friday", value: 5 },
  { name: "Saturday", value: 6 },
];

export function AvailabilitySection({ onUnsavedChanges }: AvailabilitySectionProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(() => buildScheduleFromAvailability([]));
  const [hasChanges, setHasChanges] = useState(false);
  const [copyFromDay, setCopyFromDay] = useState<string>("");
  
  // Query hooks
  const { data: availabilityData, isLoading, isError } = useDoctorAvailability();
  const updateAvailabilityMutation = useUpdateAvailability();
  const deleteSlotMutation = useDeleteAvailabilitySlot();
  
  // Initialize schedule from availability data
  useEffect(() => {
    if (!availabilityData) return;
    setSchedule(buildScheduleFromAvailability(availabilityData));
    setHasChanges(false);
  }, [availabilityData]);
  
  // Notify parent of changes
  useEffect(() => {
    onUnsavedChanges(hasChanges);
  }, [hasChanges, onUnsavedChanges]);
  
  const handleToggleDay = (dayIndex: number) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].isOff = !newSchedule[dayIndex].isOff;
    
    // If turning off, clear all slots
    if (newSchedule[dayIndex].isOff) {
      newSchedule[dayIndex].slots = [];
    } else {
      // If turning on, add a default slot
      newSchedule[dayIndex].slots = [{
        dayOfWeek: newSchedule[dayIndex].dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
        hasBreak: false,
        isAvailable: true,
      }];
    }
    
    setSchedule(newSchedule);
    setHasChanges(true);
  };
  
  const handleAddSlot = (dayIndex: number) => {
    const newSchedule = [...schedule];
    const newSlot: TimeSlot = {
      dayOfWeek: newSchedule[dayIndex].dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
      hasBreak: false,
      isAvailable: true,
    };
    
    newSchedule[dayIndex].slots.push(newSlot);
    setSchedule(newSchedule);
    setHasChanges(true);
  };
  
  const handleRemoveSlot = async (dayIndex: number, slotIndex: number) => {
    const slot = schedule[dayIndex].slots[slotIndex];
    
    // If slot has an ID, delete it from the server
    if (slot.id) {
      try {
        await deleteSlotMutation.mutateAsync(slot.id);
      } catch (error) {
        console.error("Error deleting slot:", error);
        return;
      }
    }
    
    // Remove from local state
    const newSchedule = [...schedule];
    newSchedule[dayIndex].slots.splice(slotIndex, 1);
    setSchedule(newSchedule);
    setHasChanges(true);
  };
  
  const handleSlotChange = (
    dayIndex: number, 
    slotIndex: number, 
    field: keyof TimeSlot, 
    value: any
  ) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].slots[slotIndex] = {
      ...newSchedule[dayIndex].slots[slotIndex],
      [field]: value,
    };
    setSchedule(newSchedule);
    setHasChanges(true);
  };
  
  const handleCopySchedule = () => {
    if (!copyFromDay) return;
    
    const sourceDay = schedule.find(day => day.day === copyFromDay);
    if (!sourceDay) return;
    
    const newSchedule = schedule.map(day => {
      if (day.day !== copyFromDay) {
        return {
          ...day,
          isOff: sourceDay.isOff,
          slots: sourceDay.slots.map(slot => ({
            ...slot,
            dayOfWeek: day.dayOfWeek,
            id: undefined, // Remove ID so it's treated as new
          })),
        };
      }
      return day;
    });
    
    setSchedule(newSchedule);
    setHasChanges(true);
    setCopyFromDay("");
    toast.success(`Copied schedule from ${copyFromDay} to all days`);
  };
  
  const handleSave = async () => {
    // Prevent overlapping slots for the same day
    const hasOverlap = schedule.some((day) => {
      const slots = day.slots;
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          if (rangesOverlap(slots[i], slots[j])) {
            return true;
          }
        }
      }
      return false;
    });

    if (hasOverlap) {
      toast.error("Time slots overlap on the same day. Adjust start/end times.");
      return;
    }

    try {
      // Convert schedule to the format expected by the API
      const availabilityData = schedule.flatMap(day => 
        day.slots.map(slot => ({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          hasBreak: slot.hasBreak,
          breakStart: slot.breakStart,
          breakEnd: slot.breakEnd,
          isAvailable: slot.isAvailable,
        }))
      );
      
      await updateAvailabilityMutation.mutateAsync(availabilityData);
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving availability:", error);
    }
  };
  
  const handleCancel = () => {
    // Reset to original data
    if (availabilityData) {
      setSchedule(buildScheduleFromAvailability(availabilityData));
    } else {
      setSchedule(buildScheduleFromAvailability([]));
    }
    setHasChanges(false);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading availability...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Unable to load availability right now. Please try again later.
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium">Weekly Availability</h3>
        <p className="text-slate-600 mt-1">
          Set your available hours for patient consultations
        </p>
      </div>
      
      {/* Copy Schedule Tool */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Label className="font-medium">Copy schedule to all days:</Label>
          <Select value={copyFromDay} onValueChange={setCopyFromDay}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {schedule.map(day => (
                <SelectItem key={day.day} value={day.day}>
                  {day.day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleCopySchedule}
            disabled={!copyFromDay}
            size="sm"
            variant="outline"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
        </div>
      </Card>
      
      {/* Schedule for each day */}
      <div className="space-y-6">
        {schedule.map((daySchedule, dayIndex) => (
          <Card key={daySchedule.day} className="p-4">
            <div className="space-y-4">
              {/* Day header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium">{daySchedule.day}</h4>
                  <Switch
                    checked={!daySchedule.isOff}
                    onCheckedChange={() => handleToggleDay(dayIndex)}
                  />
                  <span className="text-sm text-slate-600">
                    {daySchedule.isOff ? "Day off" : "Available"}
                  </span>
                </div>
                {!daySchedule.isOff && (
                  <Button
                    onClick={() => handleAddSlot(dayIndex)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Time Slot
                  </Button>
                )}
              </div>
              
              {/* Time slots */}
              {!daySchedule.isOff && daySchedule.slots.map((slot, slotIndex) => (
                <div key={slotIndex} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Time Slot {slotIndex + 1}</span>
                    </div>
                    <Button
                      onClick={() => handleRemoveSlot(dayIndex, slotIndex)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Time inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => handleSlotChange(dayIndex, slotIndex, "startTime", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => handleSlotChange(dayIndex, slotIndex, "endTime", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Break option */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={slot.hasBreak}
                        onCheckedChange={(checked) => handleSlotChange(dayIndex, slotIndex, "hasBreak", checked)}
                      />
                      <Label>Include break time</Label>
                    </div>
                    
                    {slot.hasBreak && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <div className="space-y-2">
                          <Label>Break Start</Label>
                          <Input
                            type="time"
                            value={slot.breakStart || ""}
                            onChange={(e) => handleSlotChange(dayIndex, slotIndex, "breakStart", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Break End</Label>
                          <Input
                            type="time"
                            value={slot.breakEnd || ""}
                            onChange={(e) => handleSlotChange(dayIndex, slotIndex, "breakEnd", e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Empty state for day off */}
              {daySchedule.isOff && (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>This day is marked as unavailable</p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
      
      {/* Save/Cancel buttons */}
      {hasChanges && (
        <div className="flex gap-3 pt-6 border-t border-slate-200">
          <Button 
            onClick={handleSave}
            disabled={updateAvailabilityMutation.isPending}
          >
            {updateAvailabilityMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Save Availability
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

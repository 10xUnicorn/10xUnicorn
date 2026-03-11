import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Colors = {
  bg: { default: '#0B0F1A', card: '#141926', input: '#1A2036' },
  text: { primary: '#F0F0F5', secondary: '#8E8EA0', tertiary: '#555573' },
  brand: { primary: '#A855F7', accent: '#06B6D4' },
  border: { default: '#252540' },
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Get smart default date: today if before 3 PM, tomorrow if after
export const getSmartDefaultDate = (): string => {
  const now = new Date();
  const target = now.getHours() >= 15 ? new Date(now.getTime() + 86400000) : now;
  return target.toISOString().split('T')[0];
};

interface CalendarPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  selectedDate?: string;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({ visible, onClose, onSelect, selectedDate }) => {
  const initial = selectedDate || getSmartDefaultDate();
  const [viewYear, setViewYear] = useState(parseInt(initial.split('-')[0]));
  const [viewMonth, setViewMonth] = useState(parseInt(initial.split('-')[1]) - 1);

  const todayStr = new Date().toISOString().split('T')[0];

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const cells: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];
    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ day: d, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isCurrentMonth: false });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, dateStr: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isCurrentMonth: true });
    }
    // Next month leading days
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ day: d, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isCurrentMonth: false });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={s.overlay}>
        <View style={s.container}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity testID="cal-prev-month" onPress={goToPrevMonth} style={s.navBtn}>
              <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={s.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity testID="cal-next-month" onPress={goToNextMonth} style={s.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={s.weekRow}>
            {WEEKDAYS.map(d => <Text key={d} style={s.weekDay}>{d}</Text>)}
          </View>

          {/* Days grid */}
          <View style={s.grid}>
            {days.map((cell, idx) => {
              const isSelected = cell.dateStr === selectedDate;
              const isToday = cell.dateStr === todayStr;
              return (
                <TouchableOpacity
                  key={idx}
                  testID={`cal-day-${cell.dateStr}`}
                  style={[
                    s.dayCell,
                    isSelected && s.dayCellSelected,
                    isToday && !isSelected && s.dayCellToday,
                  ]}
                  onPress={() => { onSelect(cell.dateStr); onClose(); }}
                >
                  <Text style={[
                    s.dayText,
                    !cell.isCurrentMonth && s.dayTextOther,
                    isSelected && s.dayTextSelected,
                    isToday && !isSelected && s.dayTextToday,
                  ]}>
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity testID="cal-today-btn" style={s.todayBtn} onPress={() => {
              const smart = getSmartDefaultDate();
              const d = new Date(smart + 'T12:00:00');
              setViewYear(d.getFullYear());
              setViewMonth(d.getMonth());
              onSelect(smart);
              onClose();
            }}>
              <Text style={s.todayBtnText}>Smart Default</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="cal-cancel-btn" style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const CELL_SIZE = 42;

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { backgroundColor: Colors.bg.card, borderRadius: 16, padding: 16, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: Colors.border.default },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: 8 },
  monthTitle: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { width: CELL_SIZE, textAlign: 'center', color: Colors.text.tertiary, fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: CELL_SIZE, height: CELL_SIZE, justifyContent: 'center', alignItems: 'center', borderRadius: CELL_SIZE / 2 },
  dayCellSelected: { backgroundColor: Colors.brand.primary },
  dayCellToday: { borderWidth: 1.5, borderColor: Colors.brand.accent },
  dayText: { color: Colors.text.primary, fontSize: 14, fontWeight: '500' },
  dayTextOther: { color: Colors.text.tertiary },
  dayTextSelected: { color: '#fff', fontWeight: '700' },
  dayTextToday: { color: Colors.brand.accent, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 12 },
  todayBtn: { flex: 1, backgroundColor: Colors.brand.primary + '20', borderRadius: 10, padding: 12, alignItems: 'center' },
  todayBtnText: { color: Colors.brand.primary, fontWeight: '600', fontSize: 14 },
  cancelBtn: { flex: 1, backgroundColor: Colors.bg.input, borderRadius: 10, padding: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.text.secondary, fontWeight: '600', fontSize: 14 },
});

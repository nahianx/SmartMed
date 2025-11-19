import { render, screen } from '@testing-library/react'
import { Timeline } from './timeline'
import type { TimelineActivity, FilterState } from '@/types/timeline'

const baseFilters: FilterState = {
  role: 'patient',
  dateRange: { from: null, to: null },
  types: [],
  statuses: [],
  searchText: '',
}

const sampleActivities: TimelineActivity[] = [
  {
    id: '1',
    type: 'appointment',
    date: new Date('2025-11-05T10:30:00Z'),
    title: 'Visit with Dr. Sarah Chen, Cardiology',
    subtitle: 'Memorial Hospital',
    tags: ['Follow-up'],
    status: 'completed',
    doctorName: 'Dr. Sarah Chen',
    specialty: 'Cardiology',
    clinic: 'Memorial Hospital',
  },
  {
    id: '2',
    type: 'report',
    date: new Date('2025-11-04T09:00:00Z'),
    title: 'Blood Panel Results.pdf uploaded',
    subtitle: 'Lab Report',
  },
]

describe('Timeline component', () => {
  it('renders activities grouped by date', () => {
    render(
      <Timeline
        activities={sampleActivities}
        filters={baseFilters}
        onOpenDetails={jest.fn()}
      />,
    )

    expect(
      screen.getByText('Visit with Dr. Sarah Chen, Cardiology'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Blood Panel Results.pdf uploaded'),
    ).toBeInTheDocument()
  })

  it('shows empty state when no activities match filters', () => {
    const filters: FilterState = {
      ...baseFilters,
      searchText: 'nonexistent search',
    }

    render(
      <Timeline
        activities={sampleActivities}
        filters={filters}
        onOpenDetails={jest.fn()}
      />,
    )

    expect(screen.getByText(/no activities found/i)).toBeInTheDocument()
  })
})

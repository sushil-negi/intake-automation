import { TextInput, TextArea, YesNoToggle, SectionHeader } from '../ui/FormFields';
import type { ClientHelpListData } from '../../types/forms';

interface Props {
  data: ClientHelpListData;
  onChange: (data: Partial<ClientHelpListData>) => void;
}

export function ClientHelpList({ data, onChange }: Props) {
  const updateContact = (index: number, field: string, value: string) => {
    const contacts = [...data.emergencyContacts];
    contacts[index] = { ...contacts[index], [field]: value };
    onChange({ emergencyContacts: contacts });
  };

  const updateDoctor = (index: number, field: string, value: string) => {
    const doctors = [...data.doctors];
    doctors[index] = { ...doctors[index], [field]: value };
    onChange({ doctors: doctors });
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Client Information */}
      <SectionHeader title="Client Information" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput
          label="Client Name"
          value={data.clientName}
          onChange={e => onChange({ clientName: e.target.value })}
          placeholder="Full name"
        />
        <TextInput
          label="Date of Birth"
          type="date"
          value={data.dateOfBirth}
          onChange={e => onChange({ dateOfBirth: e.target.value })}
        />
      </div>
      <TextInput
        label="Client Address"
        value={data.clientAddress}
        onChange={e => onChange({ clientAddress: e.target.value })}
        placeholder="Street address, city, state, zip"
      />
      <TextInput
        label="Client Phone Number"
        type="tel"
        value={data.clientPhone}
        onChange={e => onChange({ clientPhone: e.target.value })}
        placeholder="(555) 555-5555"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput
          label="Referral Agency"
          value={data.referralAgency}
          onChange={e => onChange({ referralAgency: e.target.value })}
        />
        <TextInput
          label="Date"
          type="date"
          value={data.date}
          onChange={e => onChange({ date: e.target.value })}
        />
      </div>
      <TextArea
        label="Goals"
        value={data.goals}
        onChange={e => onChange({ goals: e.target.value })}
        rows={3}
        placeholder="Client care goals..."
      />

      {/* Emergency Contacts */}
      <SectionHeader title="Emergency Contacts" subtitle="Up to 3 emergency contacts" />
      {data.emergencyContacts.map((contact, index) => (
        <div key={index} className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-500">Contact {index + 1}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput
              label="Name"
              value={contact.name}
              onChange={e => updateContact(index, 'name', e.target.value)}
            />
            <TextInput
              label="Relationship"
              value={contact.relationship}
              onChange={e => updateContact(index, 'relationship', e.target.value)}
            />
          </div>
          <TextInput
            label="Address"
            value={contact.address}
            onChange={e => updateContact(index, 'address', e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput
              label="Phone (1)"
              type="tel"
              value={contact.phone1}
              onChange={e => updateContact(index, 'phone1', e.target.value)}
            />
            <TextInput
              label="Phone (2)"
              type="tel"
              value={contact.phone2}
              onChange={e => updateContact(index, 'phone2', e.target.value)}
            />
          </div>
        </div>
      ))}

      {/* Doctor Information */}
      <SectionHeader title="Doctor Information" subtitle="Up to 3 doctors" />
      {data.doctors.map((doctor, index) => (
        <div key={index} className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-500">Doctor {index + 1}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextInput
              label="Doctor Name"
              value={doctor.name}
              onChange={e => updateDoctor(index, 'name', e.target.value)}
            />
            <TextInput
              label="Type of Doctor"
              value={doctor.type}
              onChange={e => updateDoctor(index, 'type', e.target.value)}
              placeholder="e.g., Primary, Cardiologist"
            />
            <TextInput
              label="Phone"
              type="tel"
              value={doctor.phone}
              onChange={e => updateDoctor(index, 'phone', e.target.value)}
            />
          </div>
        </div>
      ))}

      {/* Hospital Preference */}
      <SectionHeader title="Hospital Preference" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput
          label="Hospital 1"
          value={data.hospitalPreference1}
          onChange={e => onChange({ hospitalPreference1: e.target.value })}
        />
        <TextInput
          label="Hospital 2"
          value={data.hospitalPreference2}
          onChange={e => onChange({ hospitalPreference2: e.target.value })}
        />
      </div>

      {/* Neighbor */}
      <SectionHeader title="Neighbor(s)" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TextInput
          label="Name"
          value={data.neighborName}
          onChange={e => onChange({ neighborName: e.target.value })}
        />
        <TextInput
          label="Phone"
          type="tel"
          value={data.neighborPhone}
          onChange={e => onChange({ neighborPhone: e.target.value })}
        />
        <YesNoToggle
          label="Has Keys?"
          value={data.neighborHasKeys}
          onChange={val => onChange({ neighborHasKeys: val })}
        />
      </div>

      {/* Health Recently/Events */}
      <SectionHeader title="Health Recently / Events" />
      <TextArea
        label="Recent health events"
        value={data.healthRecentlyEvents}
        onChange={e => onChange({ healthRecentlyEvents: e.target.value })}
        rows={4}
        placeholder="Describe any recent health events..."
      />
    </div>
  );
}

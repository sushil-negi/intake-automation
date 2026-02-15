import { TextInput, TextArea, YesNoToggle, SectionHeader } from '../ui/FormFields';
import { AddressAutocomplete } from '../ui/AddressAutocomplete';
import { PhoneInput } from '../ui/PhoneInput';
import type { ClientHelpListData } from '../../types/forms';

interface Props {
  data: ClientHelpListData;
  onChange: (data: Partial<ClientHelpListData>) => void;
  errors?: Record<string, string>;
}

const EMPTY_CONTACT = { name: '', relationship: '', address: '', phone1: '', phone2: '', email: '' };
const EMPTY_DOCTOR = { name: '', type: '', phone: '' };
const EMPTY_HOSPITAL = { name: '' };
const EMPTY_NEIGHBOR = { name: '', phone: '', hasKeys: '' as const };

export function ClientHelpList({ data, onChange, errors }: Props) {
  const updateContact = (index: number, field: string, value: string) => {
    const contacts = [...data.emergencyContacts];
    contacts[index] = { ...contacts[index], [field]: value };
    onChange({ emergencyContacts: contacts });
  };

  const addContact = () => {
    onChange({ emergencyContacts: [...data.emergencyContacts, { ...EMPTY_CONTACT }] });
  };

  const removeContact = (index: number) => {
    const contacts = data.emergencyContacts.filter((_, i) => i !== index);
    onChange({ emergencyContacts: contacts.length > 0 ? contacts : [{ ...EMPTY_CONTACT }] });
  };

  const updateDoctor = (index: number, field: string, value: string) => {
    const doctors = [...data.doctors];
    doctors[index] = { ...doctors[index], [field]: value };
    onChange({ doctors: doctors });
  };

  const addDoctor = () => {
    onChange({ doctors: [...data.doctors, { ...EMPTY_DOCTOR }] });
  };

  const removeDoctor = (index: number) => {
    const doctors = data.doctors.filter((_, i) => i !== index);
    onChange({ doctors: doctors.length > 0 ? doctors : [{ ...EMPTY_DOCTOR }] });
  };

  const updateHospital = (index: number, value: string) => {
    const hospitals = [...data.hospitals];
    hospitals[index] = { name: value };
    onChange({ hospitals });
  };

  const addHospital = () => {
    onChange({ hospitals: [...data.hospitals, { ...EMPTY_HOSPITAL }] });
  };

  const removeHospital = (index: number) => {
    const hospitals = data.hospitals.filter((_, i) => i !== index);
    onChange({ hospitals: hospitals.length > 0 ? hospitals : [{ ...EMPTY_HOSPITAL }] });
  };

  const updateNeighbor = (index: number, field: string, value: string) => {
    const neighbors = [...data.neighbors];
    neighbors[index] = { ...neighbors[index], [field]: value };
    onChange({ neighbors });
  };

  const addNeighbor = () => {
    onChange({ neighbors: [...data.neighbors, { ...EMPTY_NEIGHBOR }] });
  };

  const removeNeighbor = (index: number) => {
    const neighbors = data.neighbors.filter((_, i) => i !== index);
    onChange({ neighbors: neighbors.length > 0 ? neighbors : [{ ...EMPTY_NEIGHBOR }] });
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
          error={errors?.clientName}
        />
        <TextInput
          label="Date of Birth"
          type="date"
          value={data.dateOfBirth}
          onChange={e => onChange({ dateOfBirth: e.target.value })}
          error={errors?.dateOfBirth}
        />
      </div>
      <AddressAutocomplete
        label="Client Address"
        value={data.clientAddress}
        onChange={val => onChange({ clientAddress: val })}
        placeholder="Street address, city, state, zip"
      />
      <PhoneInput
        label="Client Phone Number"
        value={data.clientPhone}
        onChange={val => onChange({ clientPhone: val })}
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
      <SectionHeader title="Emergency Contacts" />
      {data.emergencyContacts.map((contact, index) => (
        <div key={index} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Contact {index + 1}</p>
            {data.emergencyContacts.length > 1 && (
              <button
                type="button"
                onClick={() => removeContact(index)}
                aria-label={`Remove contact ${index + 1}`}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 font-medium min-h-[44px] px-2 py-2"
              >
                Remove
              </button>
            )}
          </div>
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
          <AddressAutocomplete
            label="Address"
            value={contact.address}
            onChange={val => updateContact(index, 'address', val)}
            placeholder="Street address, city, state, zip"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PhoneInput
              label="Phone (1)"
              value={contact.phone1}
              onChange={val => updateContact(index, 'phone1', val)}
            />
            <PhoneInput
              label="Phone (2)"
              value={contact.phone2}
              onChange={val => updateContact(index, 'phone2', val)}
            />
          </div>
          <TextInput
            label="Email"
            type="email"
            value={contact.email}
            onChange={e => updateContact(index, 'email', e.target.value)}
            placeholder="email@example.com"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addContact}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-500 dark:text-slate-400 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
      >
        + Add Emergency Contact
      </button>

      {/* Doctor Information */}
      <SectionHeader title="Doctor Information" />
      {data.doctors.map((doctor, index) => (
        <div key={index} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Doctor {index + 1}</p>
            {data.doctors.length > 1 && (
              <button
                type="button"
                onClick={() => removeDoctor(index)}
                aria-label={`Remove doctor ${index + 1}`}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 font-medium min-h-[44px] px-2 py-2"
              >
                Remove
              </button>
            )}
          </div>
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
            <PhoneInput
              label="Phone"
              value={doctor.phone}
              onChange={val => updateDoctor(index, 'phone', val)}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addDoctor}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-500 dark:text-slate-400 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
      >
        + Add Doctor
      </button>

      {/* Hospital Preference */}
      <SectionHeader title="Hospital Preference" />
      {data.hospitals.map((hospital, index) => (
        <div key={index} className="flex items-end gap-3">
          <div className="flex-1">
            <TextInput
              label={`Hospital ${index + 1}`}
              value={hospital.name}
              onChange={e => updateHospital(index, e.target.value)}
            />
          </div>
          {data.hospitals.length > 1 && (
            <button
              type="button"
              onClick={() => removeHospital(index)}
              aria-label={`Remove hospital ${index + 1}`}
              className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 font-medium min-h-[44px] px-2 py-2"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addHospital}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-500 dark:text-slate-400 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
      >
        + Add Hospital
      </button>

      {/* Neighbors */}
      <SectionHeader title="Neighbor(s)" />
      {data.neighbors.map((neighbor, index) => (
        <div key={index} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Neighbor {index + 1}</p>
            {data.neighbors.length > 1 && (
              <button
                type="button"
                onClick={() => removeNeighbor(index)}
                aria-label={`Remove neighbor ${index + 1}`}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 font-medium min-h-[44px] px-2 py-2"
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextInput
              label="Name"
              value={neighbor.name}
              onChange={e => updateNeighbor(index, 'name', e.target.value)}
            />
            <PhoneInput
              label="Phone"
              value={neighbor.phone}
              onChange={val => updateNeighbor(index, 'phone', val)}
            />
            <YesNoToggle
              label="Has Keys?"
              value={neighbor.hasKeys}
              onChange={val => updateNeighbor(index, 'hasKeys', val)}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addNeighbor}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-500 dark:text-slate-400 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
      >
        + Add Neighbor
      </button>

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

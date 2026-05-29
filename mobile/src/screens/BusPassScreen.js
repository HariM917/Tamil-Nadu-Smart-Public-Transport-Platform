import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert
} from 'react-native';
import { apiService } from '../services/api';

export default function BusPassScreen() {
  const [category, setCategory] = useState('student');
  const [passType, setPassType] = useState('monthly');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const docType = category === 'student' ? 'student_id' : 'aadhar';
      await apiService.applyForPass(category, passType, docType, 'dummy_base64', 'document.jpg');
      Alert.alert('Success', 'Application submitted! OCR verification is pending.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const CategoryBtn = ({ val, label, emoji }) => {
    const isSelected = category === val;
    return (
      <TouchableOpacity 
        style={[styles.catBtn, isSelected && styles.catBtnSelected]}
        onPress={() => setCategory(val)}
      >
        <Text style={styles.catEmoji}>{emoji}</Text>
        <Text style={[styles.catLabel, isSelected && styles.catLabelSelected]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Digital Bus Pass</Text>
        <Text style={styles.subtitle}>Apply for a smart transport pass instantly.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Select Pass Category</Text>
        <View style={styles.row}>
          <CategoryBtn val="student" label="Student" emoji="🎓" />
          <CategoryBtn val="general" label="General" emoji="👤" />
          <CategoryBtn val="senior_citizen" label="Senior" emoji="🧓" />
        </View>

        <Text style={[styles.label, { marginTop: 20 }]}>Validity Range</Text>
        <View style={styles.row}>
          {['monthly', 'quarterly', 'annual'].map(type => (
            <TouchableOpacity 
              key={type}
              style={[styles.typeBtn, passType === type && styles.typeBtnSelected]}
              onPress={() => setPassType(type)}
            >
              <Text style={[styles.typeLabel, passType === type && styles.typeLabelSelected]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.uploadBox}>
          <Text style={styles.uploadEmoji}>📄</Text>
          <Text style={styles.uploadTitle}>Tap to Upload ID Document</Text>
          <Text style={styles.uploadSubtitle}>Image will be scanned by AI OCR</Text>
        </View>

        <TouchableOpacity 
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Application</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    backgroundColor: '#0f4c81',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#bfdbfe',
    marginTop: 4,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  catBtn: {
    width: '31%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  catBtnSelected: {
    borderColor: '#0f4c81',
    backgroundColor: '#eff6ff',
  },
  catEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  catLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  catLabelSelected: {
    color: '#0f4c81',
  },
  typeBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  typeBtnSelected: {
    backgroundColor: '#0f4c81',
    borderColor: '#0f4c81',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  typeLabelSelected: {
    color: '#fff',
  },
  uploadBox: {
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  uploadEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: '#0f4c81',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

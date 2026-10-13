import React, { useState } from 'react';
import { View, Modal, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { ThemedText } from './ThemedText';
// Importamos tu conector oficial para que funcione en el APK apuntando a Railway
import { apiRequest } from '@/lib/query-client';

interface UserRegistrationModalProps {
  visible: boolean;
  onSave: (userData: UserData) => void;
  onClose: () => void;
}

interface UserData {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export function UserRegistrationModal({ visible, onSave, onClose }: UserRegistrationModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const handleSave = async () => {
    if (!name || !phone) {
      Alert.alert('Error', 'Nombre y teléfono son obligatorios');
      return;
    }

    // --- ESCUDO DE VALIDACIÓN FRONTAL ---
    if (email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        Alert.alert('Correo inválido', 'Por favor ingresa un correo electrónico con formato válido.');
        return;
      }

      const [username] = cleanEmail.split('@');
      if (/^\d{7,}$/.test(username)) {
        Alert.alert('Correo inválido', 'Por favor utiliza un correo personal real (no secuencias de solo números).');
        return;
      }
      
      if (username.length < 3) {
        Alert.alert('Correo inválido', 'El nombre de usuario del correo es demasiado corto.');
        return;
      }
    }
    // -------------------------------------------

    const userData: UserData = { name, phone, email, address };
    
    try {
      // Usamos apiRequest en lugar de fetch con localhost
      const response = await apiRequest('POST', '/api/users/register', userData);

      if (response.ok) {
        // ✨ AQUÍ ESTÁ EL NUEVO CARTEL DE ÉXITO ✨
        Alert.alert(
          '¡Registro exitoso!', 
          'Tu cuenta ha sido creada correctamente. Ya puedes comenzar a usar AstroBar.'
        );

        onSave(userData);
        // Limpiar campos
        setName('');
        setPhone('');
        setEmail('');
        setAddress('');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'No se pudo guardar');
      }
    } catch (error) {
      Alert.alert('Error', 'Error de conexión con el servidor');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ThemedText type="h3" style={styles.title}>Registro de Usuario</ThemedText>
          
          <TextInput
            style={styles.input}
            placeholder="Nombre *"
            value={name}
            onChangeText={setName}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Teléfono *"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Dirección"
            value={address}
            onChangeText={setAddress}
          />
          
          <View style={styles.buttons}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <ThemedText>Cancelar</ThemedText>
            </Pressable>
            
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <ThemedText style={styles.saveText}>Guardar</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  saveButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FF8C00',
    flex: 1,
    alignItems: 'center',
  },
  saveText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
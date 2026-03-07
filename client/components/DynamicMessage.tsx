import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

interface DynamicMessageProps {
  context: 'checkout' | 'home' | 'profile' | 'promotion' | 'post_purchase';
}

export default function DynamicMessage({ context }: DynamicMessageProps) {
  const [message, setMessage] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    loadMessage();
  }, [context]);

  useEffect(() => {
    if (message) {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [message]);

  const loadMessage = async () => {
    try {
      const response = await api.get(`/phase2/messages?context=${context}`);
      if (response.data.success && response.data.message) {
        setMessage(response.data.message);
      }
    } catch (error) {
      console.error('Error loading message:', error);
    }
  };

  const dismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setMessage(null);
    });
  };

  if (!visible || !message) return null;

  const getIcon = (type: string) => {
    const icons: any = {
      responsible_drinking: 'warning',
      marketing: 'megaphone',
      motivation: 'trophy',
      tip: 'bulb',
      warning: 'alert-circle',
    };
    return icons[type] || 'information-circle';
  };

  const getColor = (type: string) => {
    const colors: any = {
      responsible_drinking: '#F44336',
      marketing: '#FF6B35',
      motivation: '#4CAF50',
      tip: '#2196F3',
      warning: '#FFA726',
    };
    return colors[type] || '#666';
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.card, { borderLeftColor: getColor(message.message_type) }]}>
        <View style={styles.iconContainer}>
          <Ionicons name={getIcon(message.message_type)} size={24} color={getColor(message.message_type)} />
        </View>

        <View style={styles.content}>
          {message.title && (
            <Text style={styles.title}>{message.title}</Text>
          )}
          <Text style={styles.message}>{message.message}</Text>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={dismiss}>
          <Ionicons name="close" size={20} color="#AAA" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderLeftWidth: 4,
  },
  iconContainer: {
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  message: {
    color: '#CCC',
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
});

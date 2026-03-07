import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

const { width } = Dimensions.get('window');

export default function VideosScreen() {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadVideos();
  }, [filter]);

  const loadVideos = async () => {
    try {
      const url = filter === 'all' ? '/phase2/videos' : `/phase2/videos?type=${filter}`;
      const response = await api.get(url);
      if (response.data.success) {
        setVideos(response.data.videos || []);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackView = async (videoId: string) => {
    try {
      await api.post(`/phase2/videos/${videoId}/view`);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: any = {
      promotional: 'megaphone',
      tutorial: 'school',
      invitation: 'mail',
      bar_showcase: 'storefront',
    };
    return icons[type] || 'videocam';
  };

  const getTypeLabel = (type: string) => {
    const labels: any = {
      promotional: 'Promocional',
      tutorial: 'Tutorial',
      invitation: 'Invitación',
      bar_showcase: 'Showcase',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎬 Videos</Text>
        <Text style={styles.subtitle}>Contenido multimedia de AstroDrinks</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'promotional' && styles.filterButtonActive]}
          onPress={() => setFilter('promotional')}
        >
          <Text style={[styles.filterText, filter === 'promotional' && styles.filterTextActive]}>
            Promocionales
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'tutorial' && styles.filterButtonActive]}
          onPress={() => setFilter('tutorial')}
        >
          <Text style={[styles.filterText, filter === 'tutorial' && styles.filterTextActive]}>
            Tutoriales
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'bar_showcase' && styles.filterButtonActive]}
          onPress={() => setFilter('bar_showcase')}
        >
          <Text style={[styles.filterText, filter === 'bar_showcase' && styles.filterTextActive]}>
            Bares
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView style={styles.videosList}>
        {videos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-off" size={64} color="#666" />
            <Text style={styles.emptyText}>No hay videos disponibles</Text>
          </View>
        ) : (
          videos.map((video: any) => (
            <TouchableOpacity
              key={video.id}
              style={styles.videoCard}
              onPress={() => {
                setSelectedVideo(video);
                trackView(video.id);
              }}
            >
              <View style={styles.thumbnail}>
                {video.thumbnail_url ? (
                  <View style={styles.thumbnailPlaceholder}>
                    <Ionicons name="play-circle" size={48} color="#FFF" />
                  </View>
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Ionicons name="videocam" size={48} color="#666" />
                  </View>
                )}
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>
                    {Math.floor((video.duration_seconds || 0) / 60)}:{String((video.duration_seconds || 0) % 60).padStart(2, '0')}
                  </Text>
                </View>
              </View>

              <View style={styles.videoInfo}>
                <View style={styles.videoHeader}>
                  <Ionicons name={getTypeIcon(video.video_type)} size={16} color="#FF6B35" />
                  <Text style={styles.videoType}>{getTypeLabel(video.video_type)}</Text>
                </View>

                <Text style={styles.videoTitle}>{video.title}</Text>
                {video.description && (
                  <Text style={styles.videoDesc} numberOfLines={2}>
                    {video.description}
                  </Text>
                )}

                <View style={styles.videoStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="eye" size={14} color="#AAA" />
                    <Text style={styles.statText}>{video.views || 0} vistas</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {selectedVideo && (
        <View style={styles.playerOverlay}>
          <View style={styles.playerContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedVideo(null)}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>

            <Video
              source={{ uri: selectedVideo.video_url }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />

            <View style={styles.playerInfo}>
              <Text style={styles.playerTitle}>{selectedVideo.title}</Text>
              {selectedVideo.description && (
                <Text style={styles.playerDesc}>{selectedVideo.description}</Text>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#AAA',
  },
  filters: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1A1F3A',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#FF6B35',
  },
  filterText: {
    color: '#AAA',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFF',
  },
  videosList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#AAA',
    fontSize: 16,
    marginTop: 16,
  },
  videoCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#0A0E27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  videoInfo: {
    padding: 16,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  videoType: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  videoTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  videoDesc: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 12,
  },
  videoStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#AAA',
    fontSize: 12,
  },
  playerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  playerContainer: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: width,
    height: width * (9 / 16),
    marginTop: 80,
  },
  playerInfo: {
    padding: 20,
  },
  playerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  playerDesc: {
    color: '#AAA',
    fontSize: 14,
    lineHeight: 20,
  },
});

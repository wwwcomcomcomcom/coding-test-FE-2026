import { useState } from 'react';
import { Flex, Slider, Switch, Text } from '@radix-ui/themes';

interface Props {
  imageUrl: string;
  /** 분석 완료 건만 있고 그 외 null → 컨트롤을 비활성화한다 */
  heatmapUrl: string | null;
  alt: string;
}

/**
 * 슬라이드 이미지 + heatmap 오버레이.
 * 부모(SlideDetail)가 key={id}로 렌더되므로 다른 슬라이드를 열면 토글·투명도는 기본값으로 돌아간다.
 */
export function SlideViewer({ imageUrl, heatmapUrl, alt }: Props) {
  const [visible, setVisible] = useState(true);
  const [opacity, setOpacity] = useState(50); // 0 ~ 100 (%)

  const hasHeatmap = heatmapUrl !== null;

  return (
    <Flex direction="column" gap="3">
      <div className="slide-image">
        <img src={imageUrl} alt={alt} />
        {/* 원본과 heatmap이 같은 크기(1200x800)라 같은 object-fit으로 겹치면 위치가 맞는다 */}
        {hasHeatmap && visible && (
          <img className="slide-heatmap" src={heatmapUrl} alt="" style={{ opacity: opacity / 100 }} />
        )}
      </div>

      <Flex align="center" gap="4" className="heatmap-controls">
        <Text as="label" size="2">
          <Flex align="center" gap="2">
            <Switch checked={hasHeatmap && visible} onCheckedChange={setVisible} disabled={!hasHeatmap} />
            Heatmap
          </Flex>
        </Text>
        <Slider
          aria-label="Heatmap 투명도"
          min={0}
          max={100}
          step={1}
          value={[opacity]}
          onValueChange={([value]) => setOpacity(value)}
          disabled={!hasHeatmap || !visible}
          style={{ flex: 1 }}
        />
        <Text size="2" color="gray" className="heatmap-opacity">
          {hasHeatmap ? `${opacity}%` : '없음'}
        </Text>
      </Flex>
    </Flex>
  );
}
